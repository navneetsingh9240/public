const { getEventsForAggregate, getEventsUntil, verifyEventChain } = require('../events/eventStore');
const { replayEvents } = require('../aggregates/containerAggregate');

/**
 * Reconstructs the current state of a container by replaying all events.
 */
async function getContainerState(containerId) {
  const events = await getEventsForAggregate(containerId);
  if (!events || events.length === 0) {
    return null;
  }
  return replayEvents(events, containerId);
}

/**
 * Reconstructs state at a historical point in time or at a specific version (Time Travel engine).
 */
async function getHistoricalState(containerId, { timestamp, version } = {}) {
  const events = await getEventsUntil(containerId, {
    untilTimestamp: timestamp,
    untilVersion: version,
  });

  if (!events || events.length === 0) {
    return null;
  }

  const stateAtPoint = replayEvents(events, containerId);

  return {
    queryFilter: { timestamp: timestamp || null, version: version || null },
    eventsApplied: events.length,
    state: stateAtPoint,
  };
}

/**
 * Retrieves full event history for a container.
 */
async function getContainerEvents(containerId) {
  return await getEventsForAggregate(containerId);
}

/**
 * Checks hash chain integrity for an aggregate's event stream.
 */
async function getContainerIntegrity(containerId) {
  const events = await getEventsForAggregate(containerId);
  return verifyEventChain(events);
}

module.exports = {
  getContainerState,
  getHistoricalState,
  getContainerEvents,
  getContainerIntegrity,
};
