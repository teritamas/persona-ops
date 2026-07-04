const chatService = require('../services/chatService');

exports.getChatMenu = (req, res) => {
  const { activeProject, isInitial, activeChat, hasMessages } = chatService.getActiveChatContext();

  if (isInitial || !activeChat || !hasMessages) {
    res.render('partials/chat-menu-empty', { activeProject });
  } else {
    res.render('partials/chat-menu-active', {
      activeProject,
      activeChat
    });
  }
};

exports.newChat = (req, res) => {
  chatService.createNewChat();
  res.set('HX-Redirect', '/');
  return res.send();
};

exports.switchChat = (req, res) => {
  chatService.switchChat(req.params.id);
  res.set('HX-Redirect', '/');
  return res.send();
};

exports.startPersonaChat = (req, res) => {
  const activeProject = chatService.startPersonaChat(req.params.personaId);
  if (!activeProject) {
    return res.status(404).send('Persona not found');
  }

  res.set('HX-Redirect', '/');
  res.send('');
};
