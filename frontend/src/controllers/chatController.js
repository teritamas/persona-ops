const chatService = require('../services/chatService');
const { requestPrivateApiStream } = require('../clients/private-api');
const { getActiveProject } = require('../services/dummy_data/store');
const projectService = require('../services/projectService');
const { marked } = require('marked');

exports.getChatMenu = (req, res) => {
  const { activeProject, activeChat } = chatService.getActiveChatContext();

  res.render('partials/chat-menu-active', {
    activeProject,
    activeChat,
    marked: marked.parse
  });
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

exports.streamChat = async (req, res) => {
  const { inputText, model } = req.body;
  const activeProject = getActiveProject();
  let activeChat = activeProject.chats.find(c => c.id === activeProject.activeChatId);
  
  if (!activeChat) {
    activeChat = { id: 'chat_' + Date.now(), title: 'New Chat', messages: [], type: 'general' };
    activeProject.chats.push(activeChat);
    activeProject.activeChatId = activeChat.id;
    activeProject.isInitial = false;
  }

  const userTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const userMsg = {
    id: 'msg_' + Date.now(),
    role: 'user',
    text: inputText,
    time: userTime
  };
  activeChat.messages.push(userMsg);
  await projectService.syncProject(activeProject);

  // Determine system prompt
  let systemPrompt = 'あなたはプロダクト設計・要件定義のスペシャリストです。ユーザーが共有するビジネス課題や既存仕様をもとに、仮想ペルソナの作成や新機能の要件シミュレーションを支援してください。回答は構造化された日本語で行い、必要に応じてリストやマークダウンを活用してください。';
  if (activeChat.type === 'persona') {
    const persona = activeProject.personas.find(p => p.id === activeChat.personaId);
    if (persona) {
      systemPrompt = `あなたは仮想ユーザーペルソナ「${persona.name}」（ロール: ${persona.role}）です。
特徴は「${(persona.traits || []).join('、')}」です。
これらに完全になりきって、ユーザーからの新機能要件や質問に対して、あなたの業務課題や体験に基づいて本音で回答してください。
回答は日本語で、適度に改行やマークダウンを使い、親しみやすさを持ちつつ回答してください。`;
    }
  }

  // Prep history
  const history = activeChat.messages.slice(0, -1).map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    text: m.text
  }));

  try {
    const apiRes = await requestPrivateApiStream('/api/v1/chat/stream', {
      method: 'POST',
      body: {
        message: inputText,
        history,
        model,
        systemPrompt,
        projectId: activeProject.id,
        existingPersonas: activeProject.personas || []
      }
    });

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    let fullText = '';
    const reader = apiRes.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value, { stream: true });
      fullText += text;
      res.write(value);
    }

    // Save agent message
    const agentMsg = {
      id: 'msg_' + (Date.now() + 1),
      role: 'agent',
      text: fullText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    activeChat.messages.push(agentMsg);
    await projectService.syncProject(activeProject);
    
    // データベースで新しく作成されたペルソナをローカルのステートに同期する
    await projectService.fetchProjects();

  } catch (error) {
    console.error('Streaming error in frontend controller:', error);
    res.write('\n[Error occurred during streaming]');
  } finally {
    res.end();
  }
};
