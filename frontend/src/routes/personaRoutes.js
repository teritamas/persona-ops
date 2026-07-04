const express = require('express');
const router = express.Router();
const personaController = require('../controllers/personaController');

router.get('/view/persona/:id', personaController.getPersonaDetail);
router.get('/action/persona/close', personaController.closePersonaDetail);
router.post('/action/persona/:id/position', personaController.updatePersonaPosition);

module.exports = router;
