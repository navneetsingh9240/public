const crypto = require('crypto');

/**
 * Calculates a deterministic SHA-256 hash for an event based on its immutable fields.
 *
 * @param {Object} eventData
 * @param {string} eventData.eventId
 * @param {string} eventData.aggregateId
 * @param {string} eventData.eventType
 * @param {Object} eventData.payload
 * @param {string|Date} eventData.timestamp
 * @param {number} eventData.version
 * @param {string|null} eventData.previousHash
 * @returns {string} SHA-256 hash string
 */
function calculateEventHash({ eventId, aggregateId, eventType, payload, timestamp, version, previousHash }) {
  const formattedTimestamp = new Date(timestamp).toISOString();
  // Ensure payload keys are stringified deterministically
  const payloadString = JSON.stringify(payload || {});

  const rawString = [
    eventId,
    aggregateId,
    eventType,
    payloadString,
    formattedTimestamp,
    version,
    previousHash || ''
  ].join('|');

  return crypto.createHash('sha256').update(rawString).digest('hex');
}

/**
 * Verifies the integrity of an array of events (sorted by version ascending).
 *
 * @param {Array} events - List of event objects
 * @returns {Object} Integrity result { valid: boolean, eventsChecked: number, brokenAtVersion?: number, message: string }
 */
function verifyEventChain(events) {
  if (!events || events.length === 0) {
    return { valid: true, eventsChecked: 0, message: 'No events to verify.' };
  }

  let expectedPreviousHash = null;

  for (let i = 0; i < events.length; i++) {
    const event = events[i];

    // Check previousHash link
    if (event.previousHash !== expectedPreviousHash) {
      return {
        valid: false,
        eventsChecked: i,
        brokenAtVersion: event.version,
        message: `Previous hash mismatch at version ${event.version}. Expected "${expectedPreviousHash}", got "${event.previousHash}".`
      };
    }

    // Verify eventHash calculation
    const calculatedHash = calculateEventHash({
      eventId: event.eventId,
      aggregateId: event.aggregateId,
      eventType: event.eventType,
      payload: event.payload,
      timestamp: event.timestamp,
      version: event.version,
      previousHash: event.previousHash
    });

    if (calculatedHash !== event.eventHash) {
      return {
        valid: false,
        eventsChecked: i,
        brokenAtVersion: event.version,
        message: `Hash validation failed at version ${event.version}. Tampered payload or metadata.`
      };
    }

    expectedPreviousHash = event.eventHash;
  }

  return {
    valid: true,
    eventsChecked: events.length,
    message: 'Event chain integrity verified.'
  };
}

module.exports = {
  calculateEventHash,
  verifyEventChain
};
