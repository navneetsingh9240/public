const ContainerReadModel = require('../models/ContainerReadModel');
const Event = require('../models/Event');
const { replayEvents } = require('../aggregates/containerAggregate');

/**
 * Updates the read model for a single container aggregate from its reconstructed state.
 */
async function updateContainerProjection(containerState) {
  if (!containerState || !containerState.containerId) return;

  const projectionData = {
    containerId: containerState.containerId,
    owner: containerState.owner,
    origin: containerState.origin,
    destination: containerState.destination,
    currentLocation: containerState.currentLocation,
    status: containerState.status,
    temperature: containerState.temperature,
    temperatureStatus: containerState.temperatureStatus,
    loaded: containerState.loaded,
    vesselName: containerState.vesselName,
    arrivedAtPort: containerState.arrivedAtPort,
    portName: containerState.portName,
    unloaded: containerState.unloaded,
    deliveryCompleted: containerState.deliveryCompleted,
    currentVersion: containerState.currentVersion,
    lastUpdated: containerState.lastUpdated || new Date(),
  };

  await ContainerReadModel.findOneAndUpdate(
    { containerId: containerState.containerId },
    projectionData,
    { upsert: true, new: true }
  );
}

/**
 * Rebuilds all read model projections from scratch by reading the immutable Event Store.
 */
async function rebuildAllProjections() {
  console.log('🔄 Clearing ContainerReadModel collection...');
  await ContainerReadModel.deleteMany({});

  console.log('📦 Reading all events from Event Store...');
  const allEvents = await Event.find({}).sort({ aggregateId: 1, version: 1 }).lean().exec();

  if (allEvents.length === 0) {
    console.log('ℹ️ No events found in Event Store.');
    return { containersRebuilt: 0, eventsProcessed: 0 };
  }

  // Group events by aggregateId
  const eventsByAggregate = {};
  for (const event of allEvents) {
    if (!eventsByAggregate[event.aggregateId]) {
      eventsByAggregate[event.aggregateId] = [];
    }
    eventsByAggregate[event.aggregateId].push(event);
  }

  let count = 0;
  for (const [containerId, events] of Object.entries(eventsByAggregate)) {
    const finalState = replayEvents(events, containerId);
    await updateContainerProjection(finalState);
    count++;
  }

  console.log(`✅ Projection rebuild complete! Processed ${allEvents.length} events across ${count} containers.`);
  return { containersRebuilt: count, eventsProcessed: allEvents.length };
}

module.exports = {
  updateContainerProjection,
  rebuildAllProjections,
};
