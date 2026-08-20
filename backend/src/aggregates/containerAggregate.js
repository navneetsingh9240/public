const EventTypes = require('../events/eventTypes');

/**
 * Returns the initial state of a Container Aggregate.
 */
function getInitialState(containerId = null) {
  return {
    containerId: containerId,
    owner: null,
    origin: null,
    destination: null,
    currentLocation: null,
    status: 'NON_EXISTENT', // NON_EXISTENT, CREATED, LOADED, IN_TRANSIT, ARRIVED, UNLOADED, DELIVERED
    loaded: false,
    vesselName: null,
    arrivedAtPort: false,
    portName: null,
    unloaded: false,
    deliveryCompleted: false,
    temperature: null,
    temperatureStatus: 'NORMAL', // NORMAL, WARNING, CRITICAL
    temperatureHistory: [], // Array of { timestamp, temperature, location, isSpike }
    humidity: null,
    humidityStatus: 'NORMAL', // NORMAL, WARNING
    humidityHistory: [], // Array of { timestamp, humidity, location, isSpike }
    doorOpen: false,
    doorAccessLogs: [], // Array of { timestamp, doorOpen, location }
    maxShockG: 0,
    shockEvents: [], // Array of { timestamp, gForce, location }
    geofenceBreached: false,
    geofenceEvents: [], // Array of { timestamp, latitude, longitude, location, reason }
    coordinates: { latitude: null, longitude: null },
    locationHistory: [], // Array of { timestamp, location, eventType, latitude, longitude }
    currentVersion: 0,
    lastUpdated: null,
  };
}

/**
 * pure reducer function: applyEvent(state, event)
 * Computes the next state of a Container given an immutable event.
 */
function applyEvent(state, event) {
  if (!event) return state;

  const newState = { ...state };
  newState.currentVersion = event.version;
  newState.lastUpdated = event.timestamp;

  const payload = event.payload || {};

  if (payload.latitude !== undefined && payload.longitude !== undefined) {
    newState.coordinates = { latitude: payload.latitude, longitude: payload.longitude };
  }

  switch (event.eventType) {
    case EventTypes.CONTAINER_CREATED:
      newState.containerId = event.aggregateId;
      newState.owner = payload.owner || 'Global Cargo Logistics';
      newState.origin = payload.origin || payload.initialLocation || 'Origin Port';
      newState.destination = payload.destination || 'Destination Port';
      newState.currentLocation = payload.initialLocation || payload.origin || 'Origin Port';
      newState.status = 'CREATED';
      if (payload.initialTemperature !== undefined) {
        newState.temperature = payload.initialTemperature;
      }
      newState.locationHistory = [
        ...newState.locationHistory,
        {
          timestamp: event.timestamp,
          location: newState.currentLocation,
          eventType: event.eventType,
          latitude: payload.latitude,
          longitude: payload.longitude,
        },
      ];
      break;

    case EventTypes.LOADED_ON_SHIP:
      newState.loaded = true;
      newState.vesselName = payload.vesselName || 'Ocean Freighter';
      newState.status = 'LOADED';
      if (payload.location) {
        newState.currentLocation = payload.location;
      }
      newState.locationHistory = [
        ...newState.locationHistory,
        {
          timestamp: event.timestamp,
          location: newState.currentLocation,
          eventType: event.eventType,
          vesselName: newState.vesselName,
          latitude: payload.latitude,
          longitude: payload.longitude,
        },
      ];
      break;

    case EventTypes.LOCATION_UPDATED:
      newState.currentLocation = payload.location || newState.currentLocation;
      if (newState.loaded && !newState.arrivedAtPort) {
        newState.status = 'IN_TRANSIT';
      }
      newState.locationHistory = [
        ...newState.locationHistory,
        {
          timestamp: event.timestamp,
          location: newState.currentLocation,
          eventType: event.eventType,
          latitude: payload.latitude,
          longitude: payload.longitude,
        },
      ];
      break;

    case EventTypes.TEMPERATURE_RECORDED:
      newState.temperature = payload.temperature;
      if (payload.humidity !== undefined) {
        newState.humidity = payload.humidity;
      }
      if (payload.location) {
        newState.currentLocation = payload.location;
      }
      newState.temperatureHistory = [
        ...newState.temperatureHistory,
        {
          timestamp: event.timestamp,
          temperature: payload.temperature,
          humidity: payload.humidity,
          location: payload.location || newState.currentLocation,
          isSpike: false,
        },
      ];
      break;

    case EventTypes.TEMPERATURE_SPIKE:
      newState.temperature = payload.temperature;
      newState.temperatureStatus = payload.temperature > 15 ? 'CRITICAL' : 'WARNING';
      if (payload.humidity !== undefined) {
        newState.humidity = payload.humidity;
      }
      if (payload.location) {
        newState.currentLocation = payload.location;
      }
      newState.temperatureHistory = [
        ...newState.temperatureHistory,
        {
          timestamp: event.timestamp,
          temperature: payload.temperature,
          humidity: payload.humidity,
          threshold: payload.threshold || 8.0,
          location: payload.location || newState.currentLocation,
          isSpike: true,
        },
      ];
      break;

    case EventTypes.HUMIDITY_SPIKE:
      newState.humidity = payload.humidity;
      newState.humidityStatus = 'WARNING';
      if (payload.location) {
        newState.currentLocation = payload.location;
      }
      newState.humidityHistory = [
        ...newState.humidityHistory,
        {
          timestamp: event.timestamp,
          humidity: payload.humidity,
          threshold: payload.threshold || 75,
          location: payload.location || newState.currentLocation,
          isSpike: true,
        },
      ];
      break;

    case EventTypes.CARGO_SHOCK_DETECTED:
      newState.maxShockG = Math.max(newState.maxShockG, payload.gForce || 0);
      newState.shockEvents = [
        ...newState.shockEvents,
        {
          timestamp: event.timestamp,
          gForce: payload.gForce,
          threshold: payload.threshold || 2.5,
          location: payload.location || newState.currentLocation,
        },
      ];
      break;

    case EventTypes.DOOR_OPENED:
      newState.doorOpen = true;
      newState.doorAccessLogs = [
        ...newState.doorAccessLogs,
        {
          timestamp: event.timestamp,
          doorOpen: true,
          location: payload.location || newState.currentLocation,
        },
      ];
      break;

    case EventTypes.DOOR_CLOSED:
      newState.doorOpen = false;
      newState.doorAccessLogs = [
        ...newState.doorAccessLogs,
        {
          timestamp: event.timestamp,
          doorOpen: false,
          location: payload.location || newState.currentLocation,
        },
      ];
      break;

    case EventTypes.GEOFENCE_EXITED:
    case EventTypes.UNAUTHORIZED_ROUTE_DEVIATION:
      newState.geofenceBreached = true;
      newState.geofenceEvents = [
        ...newState.geofenceEvents,
        {
          timestamp: event.timestamp,
          latitude: payload.latitude,
          longitude: payload.longitude,
          location: payload.location || newState.currentLocation,
          reason: payload.reason || 'Geofence / Corridor breach',
        },
      ];
      break;

    case EventTypes.ARRIVED_AT_PORT:
      newState.arrivedAtPort = true;
      newState.portName = payload.portName || payload.location || 'Destination Port';
      newState.currentLocation = payload.location || payload.portName || newState.currentLocation;
      newState.status = 'ARRIVED';
      newState.locationHistory = [
        ...newState.locationHistory,
        {
          timestamp: event.timestamp,
          location: newState.currentLocation,
          eventType: event.eventType,
          portName: newState.portName,
          latitude: payload.latitude,
          longitude: payload.longitude,
        },
      ];
      break;

    case EventTypes.UNLOADED:
      newState.unloaded = true;
      newState.loaded = false;
      newState.status = 'UNLOADED';
      if (payload.location) {
        newState.currentLocation = payload.location;
      }
      newState.locationHistory = [
        ...newState.locationHistory,
        {
          timestamp: event.timestamp,
          location: newState.currentLocation,
          eventType: event.eventType,
          latitude: payload.latitude,
          longitude: payload.longitude,
        },
      ];
      break;

    case EventTypes.DELIVERY_COMPLETED:
      newState.deliveryCompleted = true;
      newState.status = 'DELIVERED';
      if (payload.location) {
        newState.currentLocation = payload.location;
      }
      newState.locationHistory = [
        ...newState.locationHistory,
        {
          timestamp: event.timestamp,
          location: newState.currentLocation,
          eventType: event.eventType,
          latitude: payload.latitude,
          longitude: payload.longitude,
        },
      ];
      break;

    default:
      break;
  }

  return newState;
}

/**
 * Reconstructs container state by replaying an array of events in order.
 */
function replayEvents(events, initialId = null) {
  let state = getInitialState(initialId);
  for (const event of events) {
    state = applyEvent(state, event);
  }
  return state;
}

module.exports = {
  getInitialState,
  applyEvent,
  replayEvents,
};
