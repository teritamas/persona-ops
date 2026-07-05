import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';

import type { SimulationService } from '../../src/application/simulation-service.js';
import { ConflictError, NotFoundError } from '../../src/domain/errors.js';
import type {
  PersonaReaction,
  Simulation,
} from '../../src/domain/simulation.js';
import { simulationRoutes } from '../../src/routes/simulation-routes.js';

const simulation: Simulation = {
  id: 'simulation-1',
  projectId: 'project-1',
  requirementId: 'requirement-1',
  requirementVersion: 1,
  requirementSnapshot: {
    id: 'requirement-1',
    title: '音声入力',
    description: '移動中に入力する',
    acceptanceCriteria: [],
    sourceDocumentIds: [],
    sourceSimulationIds: [],
    version: 1,
  },
  personaSnapshots: [],
  status: 'completed',
  model: 'test-model',
  targetCount: 1,
  successCount: 1,
  failureCount: 0,
  summary: {
    averageValueScore: null,
    averageAdoptionIntentScore: null,
    averageWorkflowFitScore: null,
    positiveCount: 1,
    neutralCount: 0,
    negativeCount: 0,
  },
  createdAt: new Date('2026-01-01T00:00:00Z'),
  completedAt: new Date('2026-01-01T00:01:00Z'),
};

const reactions: PersonaReaction[] = [
  {
    simulationId: 'simulation-1',
    personaId: 'persona-1',
    personaSnapshot: {
      id: 'persona-1',
      name: '山田',
      age: 30,
      role: '営業',
      traits: [],
      background: '',
      sourceDocumentIds: [],
      updatedAt: '2026-01-01T00:00:00Z',
    },
    status: 'completed',
    sentiment: 'positive',
    shortFeedback: '便利',
    detailedFeedback: '使いやすい機能です。',
    workImage: '業務イメージ',
    concerns: [],
    createdAt: new Date('2026-01-01T00:01:00Z'),
  },
  {
    simulationId: 'simulation-1',
    personaId: 'persona-2',
    personaSnapshot: {
      id: 'persona-2',
      name: '佐藤',
      age: 30,
      role: '管理者',
      traits: [],
      background: '',
      sourceDocumentIds: [],
      updatedAt: '2026-01-01T00:00:00Z',
    },
    status: 'failed',
    errorCode: 'PERSONA_SIMULATION_FAILED',
    errorMessage: 'secret',
    createdAt: new Date('2026-01-01T00:01:00Z'),
  },
];

function createApp(service: Partial<SimulationService>) {
  const app = Fastify();
  void app.register(simulationRoutes, {
    simulationService: service as SimulationService,
  });
  return app;
}

describe('シミュレーションルーター', () => {
  it('一覧とReactionを含む詳細を返し、内部エラー文は隠す', async () => {
    const app = createApp({
      list: () => Promise.resolve([simulation]),
      getDetail: () => Promise.resolve({ simulation, reactions }),
    });

    const list = await app.inject({
      method: 'GET',
      url: '/api/v1/projects/project-1/simulations',
    });
    const detail = await app.inject({
      method: 'GET',
      url: '/api/v1/projects/project-1/simulations/simulation-1',
    });

    expect(list.statusCode).toBe(200);
    expect(detail.statusCode).toBe(200);
    expect(detail.json<{ reactions: unknown[] }>().reactions).toHaveLength(2);
    expect(detail.body).not.toContain('secret');
  });

  it('存在しない詳細には404を返す', async () => {
    const app = createApp({
      getDetail: () =>
        Promise.reject(new NotFoundError('Simulation', 'missing')),
    });
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/projects/project-1/simulations/missing',
    });
    expect(response.statusCode).toBe(404);
  });

  it('一覧・詳細の予期しないエラーを500へ変換する', async () => {
    const app = createApp({
      list: () => Promise.reject(new Error('secret')),
      getDetail: () => Promise.reject(new Error('secret')),
    });

    const list = await app.inject({
      method: 'GET',
      url: '/api/v1/projects/project-1/simulations',
    });
    const detail = await app.inject({
      method: 'GET',
      url: '/api/v1/projects/project-1/simulations/simulation-1',
    });
    expect(list.statusCode).toBe(500);
    expect(detail.statusCode).toBe(500);
  });

  it('シミュレーションの登録と削除をApplication Serviceへ委譲する', async () => {
    const app = createApp({
      request: () => Promise.resolve(simulation),
      delete: () => Promise.resolve(),
    });

    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/projects/project-1/simulations',
      payload: { requirementId: 'requirement-1' },
    });
    const deleted = await app.inject({
      method: 'DELETE',
      url: '/api/v1/projects/project-1/simulations/simulation-1',
    });

    expect(created.statusCode).toBe(201);
    expect(deleted.statusCode).toBe(204);
  });

  it('実行中Simulationとの競合を409へ変換する', async () => {
    const app = createApp({
      request: () => Promise.reject(new ConflictError('実行中です')),
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/projects/project-1/simulations',
      payload: { requirementId: 'requirement-1' },
    });

    expect(response.statusCode).toBe(409);
  });
});
