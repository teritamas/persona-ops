const express = require('express');
const router = express.Router();
const resourceController = require('../controllers/resourceController');

router.get('/view/resources', resourceController.getResourcesMenu);

module.exports = router;
