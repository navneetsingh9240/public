const EventTypes = require('../events/eventTypes');
const { getEventsForAggregate, appendEvent } = require('../events/eventStore');
const { replayEvents } = require('../aggregates/containerAggregate');
const { validateCommand } = require('../events/eventValidator');
const { updateContainerProjection } = require('../projections/containerProjection');
const { buildMerkleTree } = require('../events/merkleTree');
const { anchorToBlockchain } = require('../utils/blockchainAnchor');
const AnchorRecord = require('../models/AnchorRecord');

/**
 * Base helper for executing a command.
 */
async function executeCommand({ aggregateId, eventType, payload = {}, expectedVersion, signature = null, publicKey = null, io }) {
  const events = await getEventsForAggregate(aggregateId);
  const currentState = replayEvents(events, aggregateId);

  // Validate business rules and digital signature
  validateCommand(eventType, currentState, payload, signature, publicKey);

  // Auto-detect temperature spike rule
  let finalEventType = eventType;
  if (eventType === EventTypes.TEMPERATURE_RECORDED) {
    const threshold = payload.threshold || 8.0;
    if (payload.temperature > threshold) {
      finalEventType = EventTypes.TEMPERATURE_SPIKE;
      payload.threshold = threshold;
    }
  }

  // Attach signature metadata if signed
  if (signature && publicKey) {
    payload._carrierSignature = signature;
    payload._carrierPublicKey = publicKey;
  }

  // Append event to Event Store
  const newEvent = await appendEvent({
    aggregateId,
    eventType: finalEventType,
    payload,
    expectedVersion,
  });

  // Re-calculate state including the new event
  const updatedEvents = [...events, newEvent];
  const updatedState = replayEvents(updatedEvents, aggregateId);

  // Update projection
  await updateContainerProjection(updatedState);

  // Auto-anchor to blockchain if delivery completed
  if (finalEventType === EventTypes.DELIVERY_COMPLETED) {
    try {
      const hashes = updatedEvents.map(e => e.eventHash);
      const { root } = buildMerkleTree(hashes);
      if (root) {
        const anchorReceipt = anchorToBlockchain(aggregateId, root, updatedEvents.length);
        await AnchorRecord.create(anchorReceipt);
      }
    } catch (anchorErr) {
      console.error('Auto-anchor error:', anchorErr.message);
    }
  }

  // Emit real-time event if Socket.IO instance is provided
  if (io) {
    io.emit('eventAppended', {
      event: newEvent,
      containerState: updatedState,
    });
  }

  return { event: newEvent, state: updatedState };
}

async function createContainer({ containerId, owner, origin, destination, initialLocation, initialTemperature, expectedVersion, signature, publicKey, io }) {
  return await executeCommand({
    aggregateId: containerId,
    eventType: EventTypes.CONTAINER_CREATED,
    payload: {
      owner: owner || 'Global Cargo Logistics',
      origin: origin || initialLocation || 'Origin Port',
      destination: destination || 'Destination Port',
      initialLocation: initialLocation || origin || 'Origin Port',
      initialTemperature: initialTemperature !== undefined ? Number(initialTemperature) : 4.0,
    },
    expectedVersion,
    signature,
    publicKey,
    io,
  });
}

async function loadContainer({ containerId, vesselName, location, expectedVersion, signature, publicKey, io }) {
  return await executeCommand({
    aggregateId: containerId,
    eventType: EventTypes.LOADED_ON_SHIP,
    payload: { vesselName: vesselName || 'Ocean Freighter', location },
    expectedVersion,
    signature,
    publicKey,
    io,
  });
}

async function moveContainer({ containerId, location, notes, expectedVersion, signature, publicKey, io }) {
  return await executeCommand({
    aggregateId: containerId,
    eventType: EventTypes.LOCATION_UPDATED,
    payload: { location, notes },
    expectedVersion,
    signature,
    publicKey,
    io,
  });
}

async function recordTemperature({ containerId, temperature, location, threshold = 8.0, expectedVersion, signature, publicKey, io }) {
  return await executeCommand({
    aggregateId: containerId,
    eventType: EventTypes.TEMPERATURE_RECORDED,
    payload: { temperature: Number(temperature), location, threshold: Number(threshold) },
    expectedVersion,
    signature,
    publicKey,
    io,
  });
}

async function recordTelemetry({ containerId, temperature, humidity, shockG, doorOpen, latitude, longitude, location, geofenceBreached, expectedVersion, signature, publicKey, io }) {
  const events = await getEventsForAggregate(containerId);
  const currentState = replayEvents(events, containerId);

  validateCommand(EventTypes.TELEMETRY_RECORDED, currentState, {}, signature, publicKey);

  const generatedEvents = [];
  let currentExpectedVersion = expectedVersion;

  // 1. Temperature / Humidity evaluation
  const tempVal = temperature !== undefined ? Number(temperature) : currentState.temperature;
  const humVal = humidity !== undefined ? Number(humidity) : currentState.humidity;
  const shockVal = shockG !== undefined ? Number(shockG) : 0;
  const locVal = location || currentState.currentLocation;

  if (tempVal !== null && tempVal > 8.0) {
    const tempRes = await executeCommand({
      aggregateId: containerId,
      eventType: EventTypes.TEMPERATURE_SPIKE,
      payload: { temperature: tempVal, humidity: humVal, location: locVal, threshold: 8.0 },
      expectedVersion: currentExpectedVersion,
      signature,
      publicKey,
      io,
    });
    generatedEvents.push(tempRes.event);
    currentExpectedVersion = tempRes.event.version;
  } else if (tempVal !== null) {
    const tempRes = await executeCommand({
      aggregateId: containerId,
      eventType: EventTypes.TEMPERATURE_RECORDED,
      payload: { temperature: tempVal, humidity: humVal, location: locVal },
      expectedVersion: currentExpectedVersion,
      signature,
      publicKey,
      io,
    });
    generatedEvents.push(tempRes.event);
    currentExpectedVersion = tempRes.event.version;
  }

  // 2. Humidity spike threshold (>75%)
  if (humVal > 75) {
    const humRes = await executeCommand({
      aggregateId: containerId,
      eventType: EventTypes.HUMIDITY_SPIKE,
      payload: { humidity: humVal, threshold: 75, location: locVal },
      expectedVersion: currentExpectedVersion,
      signature,
      publicKey,
      io,
    });
    generatedEvents.push(humRes.event);
    currentExpectedVersion = humRes.event.version;
  }

  // 3. Shock G-Force breach (>2.5G)
  if (shockVal > 2.5) {
    const shockRes = await executeCommand({
      aggregateId: containerId,
      eventType: EventTypes.CARGO_SHOCK_DETECTED,
      payload: { gForce: shockVal, threshold: 2.5, location: locVal },
      expectedVersion: currentExpectedVersion,
      signature,
      publicKey,
      io,
    });
    generatedEvents.push(shockRes.event);
    currentExpectedVersion = shockRes.event.version;
  }

  // 4. Door state toggle
  if (doorOpen !== undefined && doorOpen !== currentState.doorOpen) {
    const doorType = doorOpen ? EventTypes.DOOR_OPENED : EventTypes.DOOR_CLOSED;
    const doorRes = await executeCommand({
      aggregateId: containerId,
      eventType: doorType,
      payload: { doorOpen, location: locVal },
      expectedVersion: currentExpectedVersion,
      signature,
      publicKey,
      io,
    });
    generatedEvents.push(doorRes.event);
    currentExpectedVersion = doorRes.event.version;
  }

  // 5. Geofence / Corridor deviation breach
  if (geofenceBreached || (latitude !== undefined && (latitude < -60 || latitude > 70))) {
    const geoRes = await executeCommand({
      aggregateId: containerId,
      eventType: EventTypes.GEOFENCE_EXITED,
      payload: { latitude, longitude, location: locVal, reason: 'Maritime corridor boundary exited' },
      expectedVersion: currentExpectedVersion,
      signature,
      publicKey,
      io,
    });
    generatedEvents.push(geoRes.event);
    currentExpectedVersion = geoRes.event.version;
  }

  const finalEvents = await getEventsForAggregate(containerId);
  const finalState = replayEvents(finalEvents, containerId);

  return { events: generatedEvents, state: finalState };
}

async function arriveContainer({ containerId, portName, location, expectedVersion, signature, publicKey, io }) {
  return await executeCommand({
    aggregateId: containerId,
    eventType: EventTypes.ARRIVED_AT_PORT,
    payload: { portName: portName || location, location: location || portName },
    expectedVersion,
    signature,
    publicKey,
    io,
  });
}

async function unloadContainer({ containerId, location, expectedVersion, signature, publicKey, io }) {
  return await executeCommand({
    aggregateId: containerId,
    eventType: EventTypes.UNLOADED,
    payload: { location },
    expectedVersion,
    signature,
    publicKey,
    io,
  });
}

async function completeDelivery({ containerId, location, recipient, expectedVersion, signature, publicKey, io }) {
  return await executeCommand({
    aggregateId: containerId,
    eventType: EventTypes.DELIVERY_COMPLETED,
    payload: { location, recipient },
    expectedVersion,
    signature,
    publicKey,
    io,
  });
}

async function anchorContainerBlockchain({ containerId, io }) {
  const events = await getEventsForAggregate(containerId);
  if (events.length === 0) {
    throw new Error(`Container '${containerId}' has no events to anchor.`);
  }

  const hashes = events.map(e => e.eventHash);
  const { root } = buildMerkleTree(hashes);
  const anchorReceipt = anchorToBlockchain(containerId, root, events.length);

  const createdRecord = await AnchorRecord.create(anchorReceipt);

  if (io) {
    io.emit('containerAnchored', { containerId, anchor: createdRecord });
  }

  return createdRecord;
}

module.exports = {
  createContainer,
  loadContainer,
  moveContainer,
  recordTemperature,
  recordTelemetry,
  arriveContainer,
  unloadContainer,
  completeDelivery,
  anchorContainerBlockchain,
};
