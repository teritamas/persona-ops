const {
  requestPrivateApi,
  requestPrivateApiStream,
} = require('../clients/private-api');

function projectPath(projectId, suffix = '') {
  return `/api/v1/projects/${encodeURIComponent(projectId)}${suffix}`;
}

class ChatService {
  constructor(options = {}) {
    this.requestPrivateApi =
      options.requestPrivateApiImplementation ?? requestPrivateApi;
    this.requestPrivateApiStream =
      options.requestPrivateApiStreamImplementation ?? requestPrivateApiStream;
  }

  getActiveChatContext(activeProject) {
    const activeChat =
      activeProject?.chats?.find(
        (chat) => chat.id === activeProject.activeChatId,
      ) ?? null;
    return { activeChat };
  }

  async createNewChat(activeProject) {
    return this.createChat(activeProject.id, {
      title: '新しいチャット',
      type: 'agent',
    });
  }

  async switchChat(activeProject, chatId) {
    if (!activeProject.chats.some((chat) => chat.id === chatId)) {
      return null;
    }
    const response = await this.requestPrivateApi(
      projectPath(activeProject.id, '/active-chat'),
      {
        method: 'PUT',
        body: { chatId },
      },
    );
    return response.ok ? response.data : null;
  }

  async startPersonaChat(activeProject, personaId) {
    const persona = activeProject.personas.find(
      (candidate) => candidate.id === personaId,
    );
    if (!persona) {
      return null;
    }
    const time = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    return this.createChat(activeProject.id, {
      title: `${persona.name}との個別チャット`,
      type: 'persona',
      personaId: persona.id,
      initialMessages: [
        {
          id: `msg_${Date.now()}`,
          role: 'agent',
          text: `こんにちは。${persona.role}の${persona.name}です。どのようなことについてお話ししましょうか？`,
          time,
        },
      ],
    });
  }

  async ensureActiveChat(activeProject) {
    const activeChat = activeProject.chats.find(
      (chat) => chat.id === activeProject.activeChatId,
    );
    if (activeChat) {
      return { activeChat, project: activeProject };
    }

    const project = await this.createNewChat(activeProject);
    if (!project) {
      throw new Error('Failed to create chat.');
    }
    const createdChat = project.chats.find(
      (chat) => chat.id === project.activeChatId,
    );
    if (!createdChat) {
      throw new Error('Created chat was not returned.');
    }
    return { activeChat: createdChat, project };
  }

  async appendMessages(projectId, chatId, messages) {
    const response = await this.requestPrivateApi(
      projectPath(projectId, `/chats/${encodeURIComponent(chatId)}/messages`),
      {
        method: 'POST',
        body: { messages },
      },
    );
    if (!response.ok || !response.data) {
      throw new Error('Failed to save chat messages.');
    }
    return response.data;
  }

  stream(message, history, projectId) {
    return this.requestPrivateApiStream('/api/v1/chat/stream', {
      method: 'POST',
      body: { message, history, projectId },
    });
  }

  processSystemActions(text, activeProject) {
    const actionRegistry = require('./chat/actionRegistry');
    let cleanedText = text;
    const systemMessages = [];

    // 正規表現で [SYSTEM_ACTION: ...] タグを抽出
    const tags = text.match(/\[SYSTEM_ACTION: [A-Z_]+\]/g) || [];
    tags.forEach((tag, idx) => {
      const action = actionRegistry.findByTag(tag);
      if (action) {
        cleanedText = cleanedText.replaceAll(tag, '');
        const messagePayload = action.execute(activeProject);

        systemMessages.push({
          id: 'msg_' + (Date.now() + 2 + idx),
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: '',
          ...messagePayload
        });
      }
    });

    // system 判定のメッセージが proposal より先になるようにソート
    systemMessages.sort((a, b) => {
      if (a.role === 'system' && b.role === 'proposal') return -1;
      if (a.role === 'proposal' && b.role === 'system') return 1;
      return 0;
    });

    return {
      cleanedText: cleanedText.trim(),
      systemMessages
    };
  }

  async createChat(projectId, request) {
    const response = await this.requestPrivateApi(
      projectPath(projectId, '/chats'),
      {
        method: 'POST',
        body: request,
      },
    );
    return response.ok ? response.data : null;
  }
}

module.exports = new ChatService();
module.exports.ChatService = ChatService;
