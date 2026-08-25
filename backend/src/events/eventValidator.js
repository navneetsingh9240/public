const EventTypes = require('./eventTypes');
const { verifyEventSignature } = require('../utils/cryptoSign');

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
  }
}

/**
 * Validates domain business rules against the reconstructed current state before issuing a new event.
 */
function validateCommand(eventType, currentState, payload = {}, signature = null, publicKey = null) {
  // Validate Ed25519 digital signature if provided
  if (signature && publicKey) {
    const isSignatureValid = verifyEventSignature(payload, signature, publicKey);
    if (!isSignatureValid) {
      throw new ValidationError('Invalid digital signature. Carrier signature verification failed for this telemetry/command payload.');
    }
  }

  switch (eventType) {
    case EventTypes.CONTAINER_CREATED:
      if (currentState.status !== 'NON_EXISTENT') {
        throw new ValidationError(`Container '${currentState.containerId}' already exists.`);
      }
      if (!payload.containerId && !currentState.containerId) {
        throw new ValidationError('Container ID is required.');
      }
      break;

    case EventTypes.LOADED_ON_SHIP:
      if (currentState.status === 'NON_EXISTENT') {
        throw new ValidationError('A container cannot be loaded before it is created.');
      }
      if (currentState.loaded) {
        throw new ValidationError('Container is already loaded on a ship.');
      }
      if (currentState.deliveryCompleted) {
        throw new ValidationError('Cannot load container after delivery is completed.');
      }
      break;

    case EventTypes.LOCATION_UPDATED:
      if (currentState.status === 'NON_EXISTENT') {
        throw new ValidationError('Cannot update location for a non-existent container.');
      }
      if (!payload.location) {
        throw new ValidationError('Location is required.');
      }
      break;

    case EventTypes.TEMPERATURE_RECORDED:
    case EventTypes.TEMPERATURE_SPIKE:
    case EventTypes.HUMIDITY_SPIKE:
    case EventTypes.DOOR_OPENED:
    case EventTypes.DOOR_CLOSED:
    case EventTypes.GEOFENCE_EXITED:
    case EventTypes.UNAUTHORIZED_ROUTE_DEVIATION:
    case EventTypes.TELEMETRY_RECORDED:
      if (currentState.status === 'NON_EXISTENT') {
        throw new ValidationError('Cannot record temperature or sensor telemetry for a non-existent container.');
      }
      break;

    case EventTypes.ARRIVED_AT_PORT:
      if (currentState.status === 'NON_EXISTENT') {
        throw new ValidationError('Cannot arrive container before it is created.');
      }
      if (!currentState.loaded) {
        throw new ValidationError('Container must be loaded on ship before arriving at port.');
      }
      if (currentState.arrivedAtPort) {
        throw new ValidationError('Container has already arrived at port.');
      }
      break;

    case EventTypes.UNLOADED:
      if (currentState.status === 'NON_EXISTENT') {
        throw new ValidationError('Cannot unload container before it is created.');
      }
      if (!currentState.arrivedAtPort) {
        throw new ValidationError('Container cannot be unloaded if it has not arrived at port.');
      }
      if (currentState.unloaded) {
        throw new ValidationError('Container is already unloaded.');
      }
      break;

    case EventTypes.DELIVERY_COMPLETED:
      if (currentState.status === 'NON_EXISTENT') {
        throw new ValidationError('Cannot complete delivery for a non-existent container.');
      }
      if (!currentState.unloaded) {
        throw new ValidationError('Container cannot be marked delivery completed before unloading.');
      }
      if (currentState.deliveryCompleted) {
        throw new ValidationError('Delivery is already completed.');
      }
      break;

    default:
      throw new ValidationError(`Unknown command / event type: ${eventType}`);
  }

  return true;
}

module.exports = {
  validateCommand,
  ValidationError,
};
