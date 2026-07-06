const express = require('express');
const router = express.Router();
const simulationController = require('../controllers/simulationController');

router.get('/view/simulation-square', simulationController.getSimulationSquare);
router.post('/action/simulate/run', simulationController.runSimulation);
router.post('/action/simulate/reset-reactions', simulationController.resetReactions);
router.patch('/action/sandbox/requirements/:requirementId/hide', simulationController.hideSandboxRequirement);

module.exports = router;
