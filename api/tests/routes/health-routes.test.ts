import { afterEach, describe, expect, it } from 'vitest';

import { buildApp } from '../../src/app.js';
import type { Container } from '../../src/infra/container.js';

const apps: Array<ReturnType<typeof buildApp>> = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map(async (app) => app.close()));
});
function createApp() {
  const app = buildApp({
    container: {} as unknown as Container,
    logger: false,
  });
  apps.push(app);
  return app;
}

describe('ヘルスチェックルーター', () => {
  it('api/v1 配下で Vertex AI を呼び出さずに Liveness (ヘルスチェック) を返す', async () => {
    const app = createApp();

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/healthz',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });
});
