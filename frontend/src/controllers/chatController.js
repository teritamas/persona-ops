const chatService = require('../services/chatService');
const projectService = require('../services/projectService');
const { requestPrivateApi, requestPrivateApiStream } = require('../clients/private-api');
const { marked } = require('marked');

exports.getChatMenu = (req, res) => {
  const { activeChat } = chatService.getActiveChatContext(req.activeProject);

  res.render('partials/chat-menu-active', {
    activeChat,
    marked: marked.parse
  });
};

exports.newChat = async (req, res) => {
  if (req.activeProject) {
    await chatService.createNewChat(req.activeProject);
  }
  res.set('HX-Redirect', '/');
  return res.send();
};

exports.switchChat = async (req, res) => {
  if (req.activeProject) {
    await chatService.switchChat(req.activeProject, req.params.id);
  }
  res.set('HX-Redirect', '/');
  return res.send();
};

exports.startPersonaChat = async (req, res) => {
  if (!req.activeProject) {
    return res.status(404).send('Project not found');
  }

  const updatedProject = await chatService.startPersonaChat(req.activeProject, req.params.personaId);
  if (!updatedProject) {
    return res.status(404).send('Persona not found');
  }

  res.set('HX-Redirect', '/');
  res.send('');
};

exports.streamChat = async (req, res) => {
  const { inputText } = req.body;

  if (!req.activeProject) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.write('[Error: Project not found]');
    return res.end();
  }

  let activeChat = req.activeProject.chats.find(c => c.id === req.activeProject.activeChatId);
  
  if (!activeChat) {
    activeChat = { id: 'chat_' + Date.now(), title: 'New Chat', messages: [], type: 'general' };
    req.activeProject.chats.push(activeChat);
    req.activeProject.activeChatId = activeChat.id;
    req.activeProject.isInitial = false;
  }

  const userTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const userMsg = {
    id: 'msg_' + Date.now(),
    role: 'user',
    text: inputText,
    time: userTime
  };
  activeChat.messages.push(userMsg);

  // Check if text contains a URL and add system message to history
  const hasUrl = /(https?:\/\/[^\s]+)/g.test(inputText);
  if (hasUrl) {
    activeChat.messages.push({
      id: 'msg_' + (Date.now() + 1),
      role: 'system',
      text: 'リソースに登録しました',
      time: userTime
    });
  }



  await requestPrivateApi(`/api/v1/projects/${encodeURIComponent(req.activeProject.id)}`, {
    method: 'PUT',
    body: {
      chats: req.activeProject.chats,
      activeChatId: req.activeProject.activeChatId
    }
  });

  const allowedRoles = ['user', 'agent', 'persona'];
  const history = activeChat.messages
    .slice(0, -1)
    .filter(m => allowedRoles.includes(m.role))
    .map(m => ({
      role: m.role,
      text: m.text
    }));

  try {
    const apiRes = await requestPrivateApiStream('/api/v1/chat/stream', {
      method: 'POST',
      body: {
        message: inputText,
        history,
        projectId: req.activeProject.id
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

    await requestPrivateApi(`/api/v1/projects/${encodeURIComponent(req.activeProject.id)}`, {
      method: 'PUT',
      body: {
        chats: req.activeProject.chats,
        activeChatId: req.activeProject.activeChatId
      }
    });

  } catch (error) {
    console.error('Streaming error in frontend controller:', error);
    res.write('\n[Error occurred during streaming]');
  } finally {
    res.end();
  }
};
