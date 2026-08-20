const queryHandlers = require('../queries/queryHandlers');
const ContainerReadModel = require('../models/ContainerReadModel');
const Event = require('../models/Event');
const AnchorRecord = require('../models/AnchorRecord');
const { buildMerkleTree, getMerkleProof, verifyMerkleProof } = require('../events/merkleTree');

async function handleGetContainers(req, res, next) {
  try {
    const containers = await ContainerReadModel.find({}).sort({ updatedAt: -1 }).lean().exec();
    res.status(200).json({ success: true, count: containers.length, data: containers });
  } catch (err) {
    next(err);
  }
}

async function handleGetContainerState(req, res, next) {
  try {
    const { id } = req.params;
    const state = await queryHandlers.getContainerState(id);
    if (!state) {
      return res.status(404).json({ error: 'Not Found', message: `Container '${id}' not found.` });
    }
    res.status(200).json({ success: true, data: state });
  } catch (err) {
    next(err);
  }
}

async function handleGetContainerEvents(req, res, next) {
  try {
    const { id } = req.params;
    const events = await queryHandlers.getContainerEvents(id);
    res.status(200).json({ success: true, count: events.length, data: events });
  } catch (err) {
    next(err);
  }
}

async function handleGetContainerTimeline(req, res, next) {
  try {
    const { id } = req.params;
    const events = await queryHandlers.getContainerEvents(id);
    const timeline = events.map((evt) => ({
      eventId: evt.eventId,
      version: evt.version,
      eventType: evt.eventType,
      timestamp: evt.timestamp,
      location: evt.payload?.location || evt.payload?.initialLocation || evt.payload?.portName || 'N/A',
      summary: `${evt.eventType.replace(/_/g, ' ')}${evt.payload?.temperature ? ` (${evt.payload.temperature}°C)` : ''}`,
      payload: evt.payload,
      previousHash: evt.previousHash,
      eventHash: evt.eventHash,
    }));

    res.status(200).json({ success: true, count: timeline.length, data: timeline });
  } catch (err) {
    next(err);
  }
}

async function handleGetHistoricalState(req, res, next) {
  try {
    const { id } = req.params;
    const { timestamp, version } = req.query;

    if (!timestamp && version === undefined) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Please provide either timestamp or version query parameter.',
      });
    }

    const result = await queryHandlers.getHistoricalState(id, { timestamp, version });
    if (!result) {
      return res.status(404).json({ error: 'Not Found', message: `No historical state found for container '${id}'.` });
    }

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function handleGetContainerMetrics(req, res, next) {
  try {
    const { id } = req.params;
    const state = await queryHandlers.getContainerState(id);
    if (!state) {
      return res.status(404).json({ error: 'Not Found', message: `Container '${id}' not found.` });
    }

    const spikes = state.temperatureHistory.filter((t) => t.isSpike);
    const temperatures = state.temperatureHistory.map((t) => t.temperature);
    const avgTemp = temperatures.length > 0 ? (temperatures.reduce((a, b) => a + b, 0) / temperatures.length).toFixed(1) : null;
    const maxTemp = temperatures.length > 0 ? Math.max(...temperatures) : null;
    const minTemp = temperatures.length > 0 ? Math.min(...temperatures) : null;

    res.status(200).json({
      success: true,
      data: {
        containerId: id,
        currentTemperature: state.temperature,
        temperatureStatus: state.temperatureStatus,
        averageTemperature: avgTemp !== null ? Number(avgTemp) : null,
        maxTemperature: maxTemp,
        minTemperature: minTemp,
        totalSpikes: spikes.length,
        temperatureHistory: state.temperatureHistory,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function handleGetContainerIntegrity(req, res, next) {
  try {
    const { id } = req.params;
    const integrity = await queryHandlers.getContainerIntegrity(id);
    const events = await queryHandlers.getContainerEvents(id);
    const hashes = events.map(e => e.eventHash);
    const { root: merkleRoot } = buildMerkleTree(hashes);
    const anchors = await AnchorRecord.find({ aggregateId: id }).sort({ createdAt: -1 }).lean().exec();

    res.status(200).json({
      success: true,
      data: {
        ...integrity,
        merkleRoot,
        totalAnchors: anchors.length,
        latestAnchor: anchors[0] || null
      }
    });
  } catch (err) {
    next(err);
  }
}

async function handleGetMerkleProof(req, res, next) {
  try {
    const { id } = req.params;
    const index = parseInt(req.query.index || '0', 10);
    const events = await queryHandlers.getContainerEvents(id);
    const hashes = events.map(e => e.eventHash);

    const proof = getMerkleProof(hashes, index);
    if (!proof) {
      return res.status(400).json({ error: 'Bad Request', message: `Invalid event index ${index} for container '${id}'.` });
    }

    const isValid = verifyMerkleProof(proof.leaf, proof.proof, proof.root);

    res.status(200).json({
      success: true,
      data: {
        containerId: id,
        eventIndex: index,
        event: events[index],
        proof: proof.proof,
        leaf: proof.leaf,
        root: proof.root,
        verified: isValid
      }
    });
  } catch (err) {
    next(err);
  }
}

async function handleGetContainerAnchors(req, res, next) {
  try {
    const { id } = req.params;
    const anchors = await AnchorRecord.find({ aggregateId: id }).sort({ createdAt: -1 }).lean().exec();
    res.status(200).json({ success: true, count: anchors.length, data: anchors });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  handleGetContainers,
  handleGetContainerState,
  handleGetContainerEvents,
  handleGetContainerTimeline,
  handleGetHistoricalState,
  handleGetContainerMetrics,
  handleGetContainerIntegrity,
  handleGetMerkleProof,
  handleGetContainerAnchors,
};
