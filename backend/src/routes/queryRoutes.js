const express = require('express');
const router = express.Router();
const queryController = require('../controllers/queryController');

router.get('/containers', queryController.handleGetContainers);
router.get('/containers/:id', queryController.handleGetContainerState);
router.get('/containers/:id/events', queryController.handleGetContainerEvents);
router.get('/containers/:id/timeline', queryController.handleGetContainerTimeline);
router.get('/containers/:id/state-at', queryController.handleGetHistoricalState);
router.get('/containers/:id/metrics', queryController.handleGetContainerMetrics);
router.get('/containers/:id/integrity', queryController.handleGetContainerIntegrity);
router.get('/containers/:id/merkle-proof', queryController.handleGetMerkleProof);
router.get('/containers/:id/anchor', queryController.handleGetContainerAnchors);
router.get('/analytics/risk-heatmaps', queryController.handleGetFleetRiskAnalytics);

module.exports = router;
