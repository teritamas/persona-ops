const assert = require('node:assert/strict');
const test = require('node:test');

const { ChatService } = require('../src/services/chatService');

test('チャット作成とメッセージ追記に専用APIを使用する', async () => {
  const requests = [];
  const service = new ChatService({
    requestPrivateApiImplementation: async (path, options) => {
      requests.push({ path, options });
      return {
        ok: true,
        data: {
          id: 'project-1',
          chats: [{ id: 'chat-1', messages: [] }],
          activeChatId: 'chat-1',
        },
      };
    },
  });

  await service.createNewChat({ id: 'project-1' });
  await service.appendMessages('project-1', 'chat-1', [
    { id: 'message-1', role: 'user', text: 'Hello', time: '10:00' },
  ]);

  assert.equal(requests[0].path, '/api/v1/projects/project-1/chats');
  assert.equal(requests[1].path, '/api/v1/projects/project-1/chats/chat-1/messages');
  assert.equal(requests[1].options.body.messages[0].text, 'Hello');
});

test('既存のActive Chatがある場合はAPI更新せず再利用する', async () => {
  let requestCount = 0;
  const service = new ChatService({
    requestPrivateApiImplementation: async () => {
      requestCount += 1;
      throw new Error('API should not be called.');
    },
  });
  const activeProject = {
    id: 'project-1',
    activeChatId: 'chat-1',
    chats: [{ id: 'chat-1', messages: [] }],
  };

  const context = await service.ensureActiveChat(activeProject);

  assert.equal(context.activeChat.id, 'chat-1');
  assert.equal(requestCount, 0);
});

test('processSystemActionsは提案アクションメッセージにデフォルトで空文字のtextを設定する', () => {
  const service = new ChatService();
  const activeProject = { id: 'project-1', requirements: [] };
  const text = '[SYSTEM_ACTION: PROPOSE_SIMULATION]';

  const { cleanedText, systemMessages } = service.processSystemActions(text, activeProject);

  assert.equal(cleanedText, '');
  assert.equal(systemMessages.length, 1);
  assert.equal(systemMessages[0].role, 'proposal');
  assert.equal(systemMessages[0].text, ''); // Verify it defaults to empty string
  assert.equal(typeof systemMessages[0].proposal, 'object');
});

test('processSystemActionsはシミュレーション開始と承認完了をsystem messageに変換する', () => {
  const service = new ChatService();
  const activeProject = { id: 'project-1', requirements: [] };
  const text = [
    '[SYSTEM_ACTION: SIMULATION_REQUESTED]',
    '[SYSTEM_ACTION: REQUIREMENT_APPROVED]',
  ].join('\n');

  const { cleanedText, systemMessages } = service.processSystemActions(text, activeProject);

  assert.equal(cleanedText, '');
  assert.deepEqual(
    systemMessages.map((message) => ({ role: message.role, text: message.text })),
    [
      { role: 'system', text: 'シミュレーションを開始しました' },
      { role: 'system', text: '要件が承認されました' },
    ],
  );
});
