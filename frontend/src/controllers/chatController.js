const chatService = require('../services/chatService');
const { marked } = require('marked');

marked.use({
  renderer: {
    link(token) {
      return `<a target="_blank" rel="noopener noreferrer" href="${token.href}" ${token.title ? `title="${token.title}"` : ''}>${token.text}</a>`;
    }
  }
});

exports.getChatMenu = (req, res) => {
  const { activeChat } = chatService.getActiveChatContext(req.activeProject);

  res.render('partials/chat-menu-active', {
    activeChat,
    marked: marked.parse
  });
};

exports.newChat = async (req, res) => {
  if (!req.activeProject?.id) {
    return res.status(404).send('Project not found');
  }
  await chatService.createNewChat(req.activeProject);
  res.set('HX-Redirect', `/${req.activeProject.id}`);
  return res.send();
};

exports.switchChat = async (req, res) => {
  if (!req.activeProject?.id) {
    return res.status(404).send('Project not found');
  }
  const project = await chatService.switchChat(req.activeProject, req.params.id);
  if (!project) {
    return res.status(404).send('Chat not found');
  }
  res.set('HX-Redirect', `/${req.activeProject.id}`);
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

  res.set('HX-Redirect', `/${req.activeProject.id}`);
  res.send('');
};

exports.streamChat = async (req, res) => {
  const { inputText } = req.body;

  if (!req.activeProject?.id) {
    return res.status(404).send('Project not found');
  }
  if (typeof inputText !== 'string' || inputText.trim().length === 0) {
    return res.status(400).send('inputText is required');
  }

  const message = inputText.trim();
  let activeChat;
  try {
    ({ activeChat } = await chatService.ensureActiveChat(req.activeProject));
  } catch (error) {
    console.error('Failed to resolve active chat:', error);
    return res.status(502).send('Failed to prepare chat');
  }
  const userTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const userMsg = {
    id: 'msg_' + Date.now(),
    role: 'user',
    text: message,
    time: userTime
  };
  const messages = [userMsg];
  const hasUrl = /(https?:\/\/[^\s]+)/g.test(message);
  if (hasUrl) {
    messages.push({
      id: 'msg_' + (Date.now() + 1),
      role: 'system',
      text: 'リソースに登録しました',
      time: userTime
    });
  }

  const allowedRoles = ['user', 'agent', 'persona'];
  const history = activeChat.messages
    .filter(m => allowedRoles.includes(m.role))
    .map(m => ({
      role: m.role,
      text: m.text
    }));

  try {
    await chatService.appendMessages(
      req.activeProject.id,
      activeChat.id,
      messages,
    );
    const apiRes = await chatService.stream(
      message,
      history,
      req.activeProject.id,
    );
    if (!apiRes.ok || !apiRes.body) {
      throw new Error(`Chat API returned HTTP ${apiRes.status}.`);
    }

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

    const { cleanedText, systemMessages } = chatService.processSystemActions(fullText, req.activeProject);

    const agentMsg = {
      id: 'msg_' + (Date.now() + 1),
      role: 'agent',
      text: cleanedText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    const messagesToAppend = [agentMsg, ...systemMessages];

    await chatService.appendMessages(
      req.activeProject.id,
      activeChat.id,
      messagesToAppend,
    );

  } catch (error) {
    console.error('Streaming error in frontend controller:', error);
    if (!res.headersSent) {
      return res.status(502).send('Failed to stream chat response');
    }
    res.write('\n[Error occurred during streaming]');
  } finally {
    if (!res.writableEnded) {
      res.end();
    }
  }
};
