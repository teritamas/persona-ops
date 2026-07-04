const express = require('express');
const router = express.Router();

const chatRoutes = require('./chatRoutes');
const personaRoutes = require('./personaRoutes');
const simulationRoutes = require('./simulationRoutes');
const resourceRoutes = require('./resourceRoutes');
const projectRoutes = require('./projectRoutes');

router.use('/', chatRoutes);
router.use('/', personaRoutes);
router.use('/', simulationRoutes);
router.use('/', resourceRoutes);
router.use('/', projectRoutes);

module.exports = router;
