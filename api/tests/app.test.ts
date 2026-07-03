import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildApp } from '../src/app.js';
import type { VertexAiHealthService } from '../src/services/vertex-ai-health-service.js';

const apps: Array<ReturnType<typeof buildApp>> = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map(async (app) => app.close()));
});

function createApp(vertexAiHealthService: VertexAiHealthService) {
  const app = buildApp({
    logger: false,
    model: 'test-model',
    vertexAiHealthService,
  });
  apps.push(app);
  return app;
}

describe('health routes', () => {
  it('Vertex AI を呼び出さずに Liveness (ヘルスチェック) を返す', async () => {
    const check = vi.fn<() => Promise<void>>();
    const app = createApp({ check });

    const response = await app.inject({
      method: 'GET',
      url: '/healthz',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
    expect(check).not.toHaveBeenCalled();
  });

  it('Vertex AI の接続ステータス詳細を返す', async () => {
    const check = vi.fn<() => Promise<void>>().mockResolvedValue();
    const app = createApp({ check });

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
    expect(check).toHaveBeenCalledOnce();
  });

  it('Vertex AI が利用不可能な場合は安全なエラーを返す', async () => {
    const check = vi
      .fn<() => Promise<void>>()
      .mockRejectedValue(new Error('sensitive credential details'));
    const app = createApp({ check });

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
});
