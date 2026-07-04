const { requestPrivateApi } = require('../clients/private-api');

class ChatService {
  getActiveChatContext(activeProject) {
    if (!activeProject) {
      return {
        activeProject: null,
        isInitial: true,
        activeChat: null,
        hasMessages: false
      };
    }
    return {
      activeProject,
      isInitial: activeProject.isInitial,
      activeChat: activeProject.chats.find(c => c.id === activeProject.activeChatId) || null,
      hasMessages: activeProject.activeChatId && activeProject.chats.find(c => c.id === activeProject.activeChatId)?.messages?.length > 0
    };
  }

  async createNewChat(activeProject) {
    if (!activeProject || !activeProject.id) return null;

    const newId = 'chat_' + Date.now();
    const newChat = {
      id: newId,
      title: '新しいチャット',
      messages: []
    };

    const updatedChats = [...activeProject.chats, newChat];

    const response = await requestPrivateApi(`/api/v1/projects/${encodeURIComponent(activeProject.id)}`, {
      method: 'PUT',
      body: {
        chats: updatedChats,
        activeChatId: newId
      }
    });

    if (response.ok && response.data) {
      return response.data;
    }
    return null;
  }

  async switchChat(activeProject, chatId) {
    if (!activeProject || !activeProject.id) return null;

    const chat = activeProject.chats.find(c => c.id === chatId);
    if (!chat) return activeProject;

    const response = await requestPrivateApi(`/api/v1/projects/${encodeURIComponent(activeProject.id)}`, {
      method: 'PUT',
      body: {
        activeChatId: chatId
      }
    });

    if (response.ok && response.data) {
      return response.data;
    }
    return null;
  }

  async startPersonaChat(activeProject, personaId) {
    if (!activeProject || !activeProject.id) return null;

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
        { id: 'msg_init', role: 'agent', text: `こんにちは。${persona.role}の${persona.name}です。どのようなことについてお話ししましょうか？`, time: nowStr }
      ]
    };

    const updatedChats = [...activeProject.chats, newChat];

    const response = await requestPrivateApi(`/api/v1/projects/${encodeURIComponent(activeProject.id)}`, {
      method: 'PUT',
      body: {
        chats: updatedChats,
        activeChatId: newChatId
      }
    });

    if (response.ok && response.data) {
      return response.data;
    }
    return null;
  }
}

module.exports = new ChatService();
