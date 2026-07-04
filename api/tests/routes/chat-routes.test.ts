import { describe, expect, it, vi } from 'vitest';
import Fastify from 'fastify';

import { chatRoutes } from '../../src/routes/chat-routes.js';

// Mock the @google/adk library
vi.mock('@google/adk', () => {
  return {
    LlmAgent: class {},
    InMemoryRunner: class {
      runEphemeral(input: { newMessage: { parts: Array<{ text: string }> } }) {
        const text = input.newMessage.parts[0]?.text || '';
        if (text.includes('fail')) {
          throw new Error('LLM Error');
        }
        return (async function* () {
          yield await Promise.resolve({
            content: { parts: [{ text: 'こんにちは！' }] },
          });
          yield await Promise.resolve({
            content: { parts: [{ text: 'どのような要件ですか？' }] },
          });
        })();
      }
    },
  };
});

describe('チャットストリーミングルーター', () => {
  const mockPersonaOpsAgent = {
    runEphemeral: (input: any) => {
      const text = input.newMessage.parts[0]?.text || '';
      if (text.includes('fail')) {
        throw new Error('LLM Error');
      }
      return (async function* () {
        yield await Promise.resolve({
          content: { parts: [{ text: 'こんにちは！' }] },
        });
        yield await Promise.resolve({
          content: { parts: [{ text: 'どのような要件ですか？' }] },
        });
      })();
    }
  };

  const app = Fastify();
  app.register(chatRoutes, { 
    defaultModel: 'gemini-2.5-flash',
    personaOpsAgent: mockPersonaOpsAgent
  });

  it('POST /api/v1/chat/stream でLLMのテキストストリームを応答する', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/chat/stream',
      payload: {
        message: 'こんにちは',
        history: [],
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/plain');
    expect(response.headers['transfer-encoding']).toBe('chunked');
    expect(response.body).toBe('こんにちは！どのような要件ですか？');
  });

  it('POST /api/v1/chat/stream で対話履歴を含めて送信する', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/chat/stream',
      payload: {
        message: '次の要件について教えて',
        history: [
          { role: 'user', text: 'こんにちは' },
          { role: 'agent', text: 'どのような要件ですか？' },
        ],
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe('こんにちは！どのような要件ですか？');
  });

  it('POST /api/v1/chat/stream でエラーが発生した場合はエラーメッセージを返す', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/chat/stream',
      payload: {
        message: 'fail',
        history: [],
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('[Error] I apologize, but an error occurred while processing your request.');
  });
});
