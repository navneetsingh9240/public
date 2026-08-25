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

/**
 * Scans event store across all aggregates for risk incidents
 * (TEMPERATURE_SPIKE, HUMIDITY_SPIKE, CARGO_SHOCK_DETECTED, GEOFENCE_EXITED)
 * and returns risk hotspots with GPS coordinates and severity scores.
 */
async function getFleetRiskAnalytics() {
  const Event = require('../models/Event');
  const riskTypes = [
    'TEMPERATURE_SPIKE',
    'HUMIDITY_SPIKE',
    'GEOFENCE_EXITED',
    'UNAUTHORIZED_ROUTE_DEVIATION'
  ];

  const riskEvents = await Event.find({ eventType: { $in: riskTypes } })
    .sort({ timestamp: -1 })
    .lean()
    .exec();

  const knownCoordinates = {
    'Arabian Sea': { lat: 15.5, lng: 65.0 },
    'Malacca Strait': { lat: 2.5, lng: 101.8 },
    'North Atlantic Ocean': { lat: 45.0, lng: -30.0 },
    'Suez Canal': { lat: 27.8, lng: 34.3 },
    'Red Sea Transit Zone': { lat: 20.0, lng: 38.5 },
    'Singapore Terminal 3': { lat: 1.26, lng: 103.82 },
    'Mumbai Port Berth 4': { lat: 18.95, lng: 72.84 },
    'Rotterdam ECT Gateway': { lat: 51.95, lng: 4.14 },
    'New York Container Terminal': { lat: 40.64, lng: -74.15 }
  };

  const incidents = riskEvents.map(evt => {
    const locName = evt.payload?.location || 'Unknown Maritime Zone';
    const knownPos = knownCoordinates[locName] || { lat: 12.0, lng: 70.0 };
    const lat = evt.payload?.latitude !== undefined ? Number(evt.payload.latitude) : knownPos.lat;
    const lng = evt.payload?.longitude !== undefined ? Number(evt.payload.longitude) : knownPos.lng;

    let riskLevel = 'MEDIUM';
    if (evt.eventType === 'TEMPERATURE_SPIKE' && evt.payload?.temperature > 12) riskLevel = 'CRITICAL';
    if (evt.eventType === 'GEOFENCE_EXITED') riskLevel = 'HIGH';

    return {
      eventId: evt.eventId,
      containerId: evt.aggregateId,
      eventType: evt.eventType,
      location: locName,
      latitude: lat,
      longitude: lng,
      timestamp: evt.timestamp,
      riskLevel,
      details: evt.payload
    };
  });

  return {
    totalIncidents: incidents.length,
    criticalCount: incidents.filter(i => i.riskLevel === 'CRITICAL').length,
    highCount: incidents.filter(i => i.riskLevel === 'HIGH').length,
    incidents
  };
}

module.exports = {
  getContainerState,
  getHistoricalState,
  getContainerEvents,
  getContainerIntegrity,
  getFleetRiskAnalytics,
};
