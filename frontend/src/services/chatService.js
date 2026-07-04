const { getActiveProject } = require('./dummy_data/store');
const projectService = require('./projectService');

class ChatService {
  getActiveChatContext() {
    const activeProject = getActiveProject();
    return {
      activeProject,
      isInitial: activeProject.isInitial,
      activeChat: activeProject.chats.find(c => c.id === activeProject.activeChatId) || null,
      hasMessages: activeProject.activeChatId && activeProject.chats.find(c => c.id === activeProject.activeChatId)?.messages?.length > 0
    };
  }

  createNewChat() {
    const activeProject = getActiveProject();
    const newId = 'chat_' + Date.now();
    activeProject.chats.push({
      id: newId,
      title: '新しいチャット',
      messages: []
    });
    activeProject.activeChatId = newId;
    projectService.syncProject(activeProject);
    return activeProject;
  }

  switchChat(chatId) {
    const activeProject = getActiveProject();
    const chat = activeProject.chats.find(c => c.id === chatId);
    if (chat) {
      activeProject.activeChatId = chat.id;
      projectService.syncProject(activeProject);
    }
    return activeProject;
  }

  startPersonaChat(personaId) {
    const activeProject = getActiveProject();
    const persona = activeProject.personas.find(p => p.id === personaId);
    
    if (!persona) return null;

    const newChatId = 'chat_' + Date.now();
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newChat = {
      id: newChatId,
      type: 'persona',
      personaId: persona.id,
      title: persona.name + 'との個別チャット',
      messages: [
        { id: 1, role: 'agent', text: `こんにちは。${persona.role}の${persona.name}です。どのようなことについてお話ししましょうか？`, time: nowStr }
      ]
    };

    activeProject.chats.push(newChat);
    activeProject.activeChatId = newChatId;
    activeProject.isInitial = false;

    projectService.syncProject(activeProject);
    return activeProject;
  }
}

module.exports = new ChatService();
