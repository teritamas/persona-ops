import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';

import type { SimulationService } from '../../../src/application/simulation-service.js';
import { NotFoundError } from '../../../src/domain/errors.js';
import type { Simulation } from '../../../src/domain/simulation.js';
import { internalSimulationRoutes } from '../../../src/routes/internal/simulation-routes.js';

const simulation = {
  id: 'simulation-1',
  projectId: 'project-1',
  status: 'completed',
  targetCount: 2,
  successCount: 2,
  failureCount: 0,
} as Simulation;

function createApp(service: Partial<SimulationService>) {
  const app = Fastify();
  void app.register(internalSimulationRoutes, {
    simulationService: service as SimulationService,
  });
  return app;
}

const taskUrl =
  '/api/v1/internal/projects/project-1/simulations/simulation-1/run';

describe('内部シミュレーションルーター', () => {
  it('Taskの完了と実行中をHTTPステータスへ変換する', async () => {
    const doneApp = createApp({
      run: () => Promise.resolve('done'),
      getDetail: () => Promise.resolve({ simulation, reactions: [] }),
    });
    const busyApp = createApp({ run: () => Promise.resolve('busy') });

    const done = await doneApp.inject({ method: 'POST', url: taskUrl });
    const busy = await busyApp.inject({ method: 'POST', url: taskUrl });

    expect(done.statusCode).toBe(204);
    expect(busy.statusCode).toBe(409);
  });

  it('完了後にログ用集計を取得できなくてもTaskを再試行させない', async () => {
    const app = createApp({
      run: () => Promise.resolve('done'),
      getDetail: () => Promise.reject(new Error('temporary read error')),
    });

    const response = await app.inject({ method: 'POST', url: taskUrl });

    expect(response.statusCode).toBe(204);
  });

  it('存在しないTask対象には404を返す', async () => {
    const app = createApp({
      run: () =>
        Promise.reject(new NotFoundError('Simulation', 'simulation-1')),
    });

    const response = await app.inject({ method: 'POST', url: taskUrl });

    expect(response.statusCode).toBe(404);
  });

  it('予期しない実行エラーを500へ変換する', async () => {
    const app = createApp({
      run: () => Promise.reject(new Error('secret')),
    });

    const response = await app.inject({ method: 'POST', url: taskUrl });

    expect(response.statusCode).toBe(500);
    expect(response.body).not.toContain('secret');
  });
});
