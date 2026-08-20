const commandHandlers = require('../commands/commandHandlers');

async function handleCreateContainer(req, res, next) {
  try {
    const { containerId, owner, origin, destination, initialLocation, initialTemperature, expectedVersion } = req.body;
    const result = await commandHandlers.createContainer({
      containerId,
      owner,
      origin,
      destination,
      initialLocation,
      initialTemperature,
      expectedVersion,
      io: req.app.get('io'),
    });
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

async function handleLoadContainer(req, res, next) {
  try {
    const { id } = req.params;
    const { vesselName, location, expectedVersion } = req.body;
    const result = await commandHandlers.loadContainer({
      containerId: id,
      vesselName,
      location,
      expectedVersion,
      io: req.app.get('io'),
    });
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

async function handleMoveContainer(req, res, next) {
  try {
    const { id } = req.params;
    const { location, notes, expectedVersion } = req.body;
    const result = await commandHandlers.moveContainer({
      containerId: id,
      location,
      notes,
      expectedVersion,
      io: req.app.get('io'),
    });
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

async function handleRecordTemperature(req, res, next) {
  try {
    const { id } = req.params;
    const { temperature, location, threshold, expectedVersion } = req.body;
    const result = await commandHandlers.recordTemperature({
      containerId: id,
      temperature,
      location,
      threshold,
      expectedVersion,
      io: req.app.get('io'),
    });
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

async function handleRecordTelemetry(req, res, next) {
  try {
    const { id } = req.params;
    const { temperature, humidity, shockG, doorOpen, latitude, longitude, location, geofenceBreached, expectedVersion } = req.body;
    const result = await commandHandlers.recordTelemetry({
      containerId: id,
      temperature,
      humidity,
      shockG,
      doorOpen,
      latitude,
      longitude,
      location,
      geofenceBreached,
      expectedVersion,
      io: req.app.get('io'),
    });
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

async function handleArriveContainer(req, res, next) {
  try {
    const { id } = req.params;
    const { portName, location, expectedVersion } = req.body;
    const result = await commandHandlers.arriveContainer({
      containerId: id,
      portName,
      location,
      expectedVersion,
      io: req.app.get('io'),
    });
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

async function handleUnloadContainer(req, res, next) {
  try {
    const { id } = req.params;
    const { location, expectedVersion } = req.body;
    const result = await commandHandlers.unloadContainer({
      containerId: id,
      location,
      expectedVersion,
      io: req.app.get('io'),
    });
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

async function handleCompleteDelivery(req, res, next) {
  try {
    const { id } = req.params;
    const { location, recipient, expectedVersion } = req.body;
    const result = await commandHandlers.completeDelivery({
      containerId: id,
      location,
      recipient,
      expectedVersion,
      io: req.app.get('io'),
    });
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  handleCreateContainer,
  handleLoadContainer,
  handleMoveContainer,
  handleRecordTemperature,
  handleRecordTelemetry,
  handleArriveContainer,
  handleUnloadContainer,
  handleCompleteDelivery,
};
