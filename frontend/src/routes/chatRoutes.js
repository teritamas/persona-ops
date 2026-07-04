const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

router.get('/view/chat', chatController.getChatMenu);
router.post('/action/chat/new', chatController.newChat);
router.get('/action/chat/:id', chatController.switchChat);
router.post('/action/chat/persona/:personaId', chatController.startPersonaChat);
router.post('/action/chat/stream', chatController.streamChat);

module.exports = router;
