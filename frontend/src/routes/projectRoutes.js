const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');

router.get('/', projectController.getDashboard);
router.post('/action/project/switch', projectController.switchProject);
router.post('/action/project/create', projectController.createProject);
router.get('/action/project/state', projectController.getProjectState);

module.exports = router;
