const EventTypes = require('../events/eventTypes');
const { getEventsForAggregate, appendEvent } = require('../events/eventStore');
const { replayEvents } = require('../aggregates/containerAggregate');
const { validateCommand } = require('../events/eventValidator');
const { updateContainerProjection } = require('../projections/containerProjection');

/**
 * Base helper for executing a command.
 * 1. Reconstruct current aggregate state from Event Store.
 * 2. Validate domain rules.
 * 3. Append event to Event Store (with OCC check if expectedVersion passed).
 * 4. Trigger projection update.
 * 5. Return generated event and updated state.
 */
async function executeCommand({ aggregateId, eventType, payload = {}, expectedVersion, io }) {
  const events = await getEventsForAggregate(aggregateId);
  const currentState = replayEvents(events, aggregateId);

  // Validate business rules
  validateCommand(eventType, currentState, payload);

  // Auto-detect temperature spike rule
  let finalEventType = eventType;
  if (eventType === EventTypes.TEMPERATURE_RECORDED) {
    const threshold = payload.threshold || 8.0;
    if (payload.temperature > threshold) {
      finalEventType = EventTypes.TEMPERATURE_SPIKE;
      payload.threshold = threshold;
    }
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

  // Emit real-time event if Socket.IO instance is provided
  if (io) {
    io.emit('eventAppended', {
      event: newEvent,
      containerState: updatedState,
    });
  }

  return { event: newEvent, state: updatedState };
}

async function createContainer({ containerId, owner, origin, destination, initialLocation, initialTemperature, expectedVersion, io }) {
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
    io,
  });
}

async function loadContainer({ containerId, vesselName, location, expectedVersion, io }) {
  return await executeCommand({
    aggregateId: containerId,
    eventType: EventTypes.LOADED_ON_SHIP,
    payload: { vesselName: vesselName || 'Ocean Freighter', location },
    expectedVersion,
    io,
  });
}

async function moveContainer({ containerId, location, notes, expectedVersion, io }) {
  return await executeCommand({
    aggregateId: containerId,
    eventType: EventTypes.LOCATION_UPDATED,
    payload: { location, notes },
    expectedVersion,
    io,
  });
}

async function recordTemperature({ containerId, temperature, location, threshold = 8.0, expectedVersion, io }) {
  return await executeCommand({
    aggregateId: containerId,
    eventType: EventTypes.TEMPERATURE_RECORDED,
    payload: { temperature: Number(temperature), location, threshold: Number(threshold) },
    expectedVersion,
    io,
  });
}

async function arriveContainer({ containerId, portName, location, expectedVersion, io }) {
  return await executeCommand({
    aggregateId: containerId,
    eventType: EventTypes.ARRIVED_AT_PORT,
    payload: { portName: portName || location, location: location || portName },
    expectedVersion,
    io,
  });
}

async function unloadContainer({ containerId, location, expectedVersion, io }) {
  return await executeCommand({
    aggregateId: containerId,
    eventType: EventTypes.UNLOADED,
    payload: { location },
    expectedVersion,
    io,
  });
}

async function completeDelivery({ containerId, location, recipient, expectedVersion, io }) {
  return await executeCommand({
    aggregateId: containerId,
    eventType: EventTypes.DELIVERY_COMPLETED,
    payload: { location, recipient },
    expectedVersion,
    io,
  });
}

module.exports = {
  createContainer,
  loadContainer,
  moveContainer,
  recordTemperature,
  arriveContainer,
  unloadContainer,
  completeDelivery,
};
