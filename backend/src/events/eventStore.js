const { v4: uuidv4 } = require('crypto'); // We can use crypto.randomUUID or simple custom UUID
const Event = require('../models/Event');
const { calculateEventHash, verifyEventChain } = require('./eventHash');

/**
 * Custom Error for Optimistic Concurrency Control (OCC) conflicts.
 */
class ConcurrencyError extends Error {
  constructor(message, expectedVersion, currentVersion) {
    super(message);
    this.name = 'ConcurrencyError';
    this.statusCode = 409;
    this.expectedVersion = expectedVersion;
    this.currentVersion = currentVersion;
  }
}

/**
 * Custom Error for Immutability Violations.
 */
class ImmutabilityError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ImmutabilityError';
    this.statusCode = 403;
  }
}

/**
 * Appends a new event to the Event Store for a given aggregate.
 * Handles hash chaining, version auto-increment or OCC expectedVersion checks,
 * and immutable persistence.
 *
 * @param {Object} params
 * @param {string} params.aggregateId
 * @param {string} [params.aggregateType='Container']
 * @param {string} params.eventType
 * @param {Object} params.payload
 * @param {number} [params.expectedVersion] - Optional version expected by client for OCC
 * @returns {Promise<Object>} The saved immutable event document
 */
async function appendEvent({ aggregateId, aggregateType = 'Container', eventType, payload = {}, expectedVersion }) {
  // 1. Fetch latest event for this aggregate to determine current version and previous hash
  const latestEvent = await Event.findOne({ aggregateId }).sort({ version: -1 }).exec();

  const currentVersion = latestEvent ? latestEvent.version : 0;
  const previousHash = latestEvent ? latestEvent.eventHash : null;

  // 2. Optimistic Concurrency Check (OCC) if expectedVersion provided
  if (expectedVersion !== undefined && expectedVersion !== null) {
    if (expectedVersion !== currentVersion) {
      throw new ConcurrencyError(
        'Container has been modified by another operation.',
        expectedVersion,
        currentVersion
      );
    }
  }

  const nextVersion = currentVersion + 1;
  const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const timestamp = new Date();

  // 3. Compute SHA-256 Event Hash
  const eventHash = calculateEventHash({
    eventId,
    aggregateId,
    eventType,
    payload,
    timestamp,
    version: nextVersion,
    previousHash
  });

  // 4. Create and append event
  const newEvent = new Event({
    eventId,
    aggregateId,
    aggregateType,
    eventType,
    payload,
    timestamp,
    version: nextVersion,
    previousHash,
    eventHash
  });

  try {
    const savedEvent = await newEvent.save();
    return savedEvent.toObject();
  } catch (err) {
    if (err.code === 11000) {
      // Duplicate key error on aggregateId + version
      throw new ConcurrencyError(
        'Container has been modified by another operation (Duplicate Version).',
        expectedVersion !== undefined ? expectedVersion : currentVersion,
        currentVersion + 1
      );
    }
    throw err;
  }
}

/**
 * Retrieves all events for an aggregate, sorted by version ascending.
 *
 * @param {string} aggregateId
 * @returns {Promise<Array>}
 */
async function getEventsForAggregate(aggregateId) {
  return await Event.find({ aggregateId }).sort({ version: 1 }).lean().exec();
}

/**
 * Retrieves events for an aggregate up to a given timestamp or version.
 *
 * @param {string} aggregateId
 * @param {Object} filterOptions
 * @param {Date|string} [filterOptions.untilTimestamp]
 * @param {number} [filterOptions.untilVersion]
 * @returns {Promise<Array>}
 */
async function getEventsUntil(aggregateId, { untilTimestamp, untilVersion } = {}) {
  const query = { aggregateId };

  if (untilVersion !== undefined && untilVersion !== null) {
    query.version = { $lte: Number(untilVersion) };
  } else if (untilTimestamp) {
    query.timestamp = { $lte: new Date(untilTimestamp) };
  }

  return await Event.find(query).sort({ version: 1 }).lean().exec();
}

module.exports = {
  appendEvent,
  getEventsForAggregate,
  getEventsUntil,
  verifyEventChain,
  ConcurrencyError,
  ImmutabilityError
};
