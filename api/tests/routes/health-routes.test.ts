import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildApp } from '../../src/app.js';
import type { AiAgentPort } from '../../src/application/ports/ai-agent-port.js';
import type { AppConfig } from '../../src/config.js';

const apps: Array<ReturnType<typeof buildApp>> = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map(async (app) => app.close()));
});

// テスト用の最小限の config スタブ
const stubConfig = {
  VERTEX_AI_MODEL: 'test-model',
} as unknown as AppConfig;

function createApp(aiAgent: AiAgentPort) {
  const app = buildApp({
    config: stubConfig,
    container: { aiAgent },
    logger: false,
  });
  apps.push(app);
  return app;
}

describe('health routes', () => {
  it('Vertex AI を呼び出さずに Liveness (ヘルスチェック) を返す', async () => {
    const invoke = vi.fn<() => Promise<string>>();
    const app = createApp({ invoke });

    const response = await app.inject({
      method: 'GET',
      url: '/healthz',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
    expect(invoke).not.toHaveBeenCalled();
  });

  it('Vertex AI の接続ステータス詳細を返す', async () => {
    const invoke = vi.fn<() => Promise<string>>().mockResolvedValue('ok');
    const app = createApp({ invoke });

    const response = await app.inject({
      method: 'GET',
      url: '/healthz/vertexai',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      model: 'test-model',
      service: 'vertexai',
      status: 'ok',
    });
    expect(response.json()).toHaveProperty('latencyMs');
    expect(invoke).toHaveBeenCalledOnce();
  });

  it('Vertex AI が利用不可能な場合は安全なエラーを返す', async () => {
    const invoke = vi
      .fn<() => Promise<string>>()
      .mockRejectedValue(new Error('sensitive credential details'));
    const app = createApp({ invoke });

    const response = await app.inject({
      method: 'GET',
      url: '/healthz/vertexai',
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({
      code: 'VERTEX_AI_UNAVAILABLE',
      service: 'vertexai',
      status: 'error',
    });
    expect(response.body).not.toContain('sensitive');
  });

  it('Vertex AI が "ok" 以外のレスポンスを返した場合はエラーとする', async () => {
    const invoke = vi
      .fn<() => Promise<string>>()
      .mockResolvedValue('unexpected text');
    const app = createApp({ invoke });

    const response = await app.inject({
      method: 'GET',
      url: '/healthz/vertexai',
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({
      code: 'VERTEX_AI_UNAVAILABLE',
      service: 'vertexai',
      status: 'error',
    });
    expect(invoke).toHaveBeenCalledOnce();
  });
});
