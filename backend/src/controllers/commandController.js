const commandHandlers = require('../commands/commandHandlers');

async function handleCreateContainer(req, res, next) {
  try {
    const { containerId, owner, origin, destination, initialLocation, initialTemperature, expectedVersion, signature, publicKey } = req.body;
    const result = await commandHandlers.createContainer({
      containerId,
      owner,
      origin,
      destination,
      initialLocation,
      initialTemperature,
      expectedVersion,
      signature,
      publicKey,
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
    const { vesselName, location, expectedVersion, signature, publicKey } = req.body;
    const result = await commandHandlers.loadContainer({
      containerId: id,
      vesselName,
      location,
      expectedVersion,
      signature,
      publicKey,
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
    const { location, notes, expectedVersion, signature, publicKey } = req.body;
    const result = await commandHandlers.moveContainer({
      containerId: id,
      location,
      notes,
      expectedVersion,
      signature,
      publicKey,
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
    const { temperature, location, threshold, expectedVersion, signature, publicKey } = req.body;
    const result = await commandHandlers.recordTemperature({
      containerId: id,
      temperature,
      location,
      threshold,
      expectedVersion,
      signature,
      publicKey,
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
    const { temperature, humidity, shockG, doorOpen, latitude, longitude, location, geofenceBreached, expectedVersion, signature, publicKey } = req.body;
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
      signature,
      publicKey,
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
    const { portName, location, expectedVersion, signature, publicKey } = req.body;
    const result = await commandHandlers.arriveContainer({
      containerId: id,
      portName,
      location,
      expectedVersion,
      signature,
      publicKey,
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
    const { location, expectedVersion, signature, publicKey } = req.body;
    const result = await commandHandlers.unloadContainer({
      containerId: id,
      location,
      expectedVersion,
      signature,
      publicKey,
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
    const { location, recipient, expectedVersion, signature, publicKey } = req.body;
    const result = await commandHandlers.completeDelivery({
      containerId: id,
      location,
      recipient,
      expectedVersion,
      signature,
      publicKey,
      io: req.app.get('io'),
    });
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

async function handleAnchorContainer(req, res, next) {
  try {
    const { id } = req.params;
    const result = await commandHandlers.anchorContainerBlockchain({
      containerId: id,
      io: req.app.get('io'),
    });
    res.status(200).json({ success: true, anchor: result });
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
  handleAnchorContainer,
};
