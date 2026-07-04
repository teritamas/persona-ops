const express = require('express');
const router = express.Router();
const personaController = require('../controllers/personaController');

router.get('/view/persona/:id', personaController.getPersonaDetail);
router.get('/action/persona/close', personaController.closePersonaDetail);

module.exports = router;
