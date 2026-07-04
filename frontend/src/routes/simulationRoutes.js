const express = require('express');
const router = express.Router();
const simulationController = require('../controllers/simulationController');

router.get(
  '/view/simulations/:simulationId',
  simulationController.getSimulationDashboard,
);
router.get('/view/simulations', simulationController.getSimulationDashboard);
router.get('/view/simulation-square', simulationController.getSimulationSquare);

module.exports = router;
