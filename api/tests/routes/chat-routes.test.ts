import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';

import type { PersonaOpsChatService } from '../../src/application/persona-ops-chat-service.js';
import { chatRoutes } from '../../src/routes/chat-routes.js';

function createChatService(): PersonaOpsChatService {
  return {
    stream: async ({ message }: { message: string }) => {
      await Promise.resolve();
      if (message === 'fail') {
        throw new Error('LLM Error');
      }
      return (async function* () {
        yield await Promise.resolve('こんにちは！');
        yield await Promise.resolve('どのような要件ですか？');
      })();
    },
  } as unknown as PersonaOpsChatService;
}

describe('チャットストリーミングルーター', () => {
  const app = Fastify();
  void app.register(chatRoutes, {
    personaOpsChatService: createChatService(),
  });

  it('プロジェクトのContextを使ってテキストストリームを応答する', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/chat/stream',
      payload: {
        projectId: 'project-1',
        message: 'こんにちは',
        history: [],
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/plain');
    expect(response.body).toBe('こんにちは！どのような要件ですか？');
  });

  it('プロジェクトIDがないリクエストを拒否する', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/chat/stream',
      payload: { message: 'こんにちは', history: [] },
    });

    expect(response.statusCode).toBe(400);
  });

  it('Agentの準備でエラーが発生した場合は安全な502を返す', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/chat/stream',
      payload: {
        projectId: 'project-1',
        message: 'fail',
        history: [],
      },
    });

    expect(response.statusCode).toBe(502);
    expect(response.body).not.toContain('secret');
  });
});
