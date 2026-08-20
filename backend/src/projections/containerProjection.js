const ContainerReadModel = require('../models/ContainerReadModel');
const Event = require('../models/Event');
const { replayEvents } = require('../aggregates/containerAggregate');

/**
 * Updates the read model projection based on the reconstructed state.
 */
async function updateContainerProjection(state) {
  if (!state || !state.containerId) return null;

  const projectionData = {
    containerId: state.containerId,
    owner: state.owner,
    origin: state.origin,
    destination: state.destination,
    currentLocation: state.currentLocation,
    status: state.status,
    loaded: state.loaded,
    vesselName: state.vesselName,
    arrivedAtPort: state.arrivedAtPort,
    portName: state.portName,
    unloaded: state.unloaded,
    deliveryCompleted: state.deliveryCompleted,
    temperature: state.temperature,
    temperatureStatus: state.temperatureStatus,
    humidity: state.humidity,
    humidityStatus: state.humidityStatus,
    doorOpen: state.doorOpen,
    maxShockG: state.maxShockG,
    geofenceBreached: state.geofenceBreached,
    coordinates: state.coordinates,
    currentVersion: state.currentVersion,
    lastUpdated: state.lastUpdated || new Date(),
  };

  return await ContainerReadModel.findOneAndUpdate(
    { containerId: state.containerId },
    projectionData,
    { upsert: true, new: true }
  );
}

/**
 * Rebuilds all projections from scratch by reading all events from the Event Store.
 */
async function rebuildAllProjections() {
  await ContainerReadModel.deleteMany({});
  const aggregateIds = await Event.distinct('aggregateId');
  let count = 0;

  for (const id of aggregateIds) {
    const events = await Event.find({ aggregateId: id }).sort({ version: 1 });
    const reconstructedState = replayEvents(events, id);
    await updateContainerProjection(reconstructedState);
    count++;
  }

  return { success: true, containersRebuilt: count };
}

module.exports = {
  updateContainerProjection,
  rebuildAllProjections,
};
