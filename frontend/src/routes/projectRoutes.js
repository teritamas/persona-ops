const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');

router.get('/', projectController.getDashboard);
router.post('/action/project/switch', projectController.switchProject);
router.post('/action/project/create', projectController.createProject);
router.get('/action/project/state', projectController.getProjectState);
router.post('/action/project/rename', projectController.renameProject);
router.post('/action/project/delete', projectController.deleteProject);

module.exports = router;
