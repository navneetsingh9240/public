const express = require('express');
const router = express.Router();
const commandController = require('../controllers/commandController');

router.post('/containers', commandController.handleCreateContainer);
router.post('/containers/:id/load', commandController.handleLoadContainer);
router.post('/containers/:id/move', commandController.handleMoveContainer);
router.post('/containers/:id/temperature', commandController.handleRecordTemperature);
router.post('/containers/:id/arrive', commandController.handleArriveContainer);
router.post('/containers/:id/unload', commandController.handleUnloadContainer);
router.post('/containers/:id/complete', commandController.handleCompleteDelivery);

module.exports = router;
