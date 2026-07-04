const express = require('express');
const router = express.Router();
const simulationController = require('../controllers/simulationController');

router.post('/action/simulate', simulationController.simulate);
router.post('/action/simulate/reactions', simulationController.simulateReactions);
router.get('/view/suggest/res', simulationController.getSuggestRes);
router.get('/view/suggest/sim', simulationController.getSuggestSim);

module.exports = router;
