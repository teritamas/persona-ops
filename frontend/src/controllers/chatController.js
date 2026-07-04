const chatService = require('../services/chatService');
const { renderChatMessage } = require('../utils/renderers');

exports.getChatMenu = (req, res) => {
  const { activeProject, isInitial, activeChat, hasMessages } = chatService.getActiveChatContext();

  if (isInitial || !activeChat || !hasMessages) {
    res.render('partials/chat-menu-empty', { activeProject });
  } else {
    let chatHeaderTitleHtml = `<h1 class="text-sm font-bold text-slate-800 flex items-center">${activeChat.title}</h1>`;
    
    if (activeChat.type === 'persona') {
      const p = activeProject.personas.find(p => p.id === activeChat.personaId);
      if (p) {
        chatHeaderTitleHtml = `
          <div class="flex items-center gap-3">
            <div class="w-7 h-7 bg-slate-100 rounded-full border border-orange-200 overflow-hidden flex items-center justify-center">
              <img src="https://api.dicebear.com/7.x/micah/svg?seed=${p.avatarSeed}&backgroundColor=f8fafc" class="w-full h-full object-cover scale-110" />
            </div>
            <div class="flex flex-col">
              <div class="flex items-center gap-2">
                <h1 class="text-sm font-bold text-slate-800">${activeChat.title}</h1>
              </div>
            </div>
          </div>
        `;
      }
    }

    const renderedMessages = (activeChat.messages || []).map(msg => renderChatMessage(msg, activeProject)).join('');

    res.render('partials/chat-menu-active', {
      activeProject,
      chatHeaderTitleHtml,
      renderedMessages
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
