import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';

import type { RequirementService } from '../../src/application/requirement-service.js';
import type { SimulationService } from '../../src/application/simulation-service.js';
import { NotFoundError, ValidationError } from '../../src/domain/errors.js';
import type { Requirement } from '../../src/domain/requirement.js';
import type {
  Simulation,
  PersonaReaction,
} from '../../src/domain/simulation.js';
import { requirementRoutes } from '../../src/routes/requirement-routes.js';

const requirement: Requirement = {
  id: 'requirement-1',
  projectId: 'project-1',
  title: '音声入力',
  description: '移動中に入力する',
  acceptanceCriteria: [],
  sourceDocumentIds: [],
  sourceSimulationIds: [],
  status: 'draft',
  version: 1,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

function createApp(
  service: Partial<RequirementService>,
  simulationService?: Partial<SimulationService>,
) {
  const app = Fastify();
  void app.register(requirementRoutes, {
    requirementService: service as RequirementService,
    simulationService: (simulationService ?? {}) as SimulationService,
  });
  return app;
}

describe('要件ルーター', () => {
  it('プロジェクトの要件一覧と詳細を返す', async () => {
    const app = createApp({
      list: () => Promise.resolve([requirement]),
      getById: () => Promise.resolve(requirement),
    });

    const list = await app.inject({
      method: 'GET',
      url: '/api/v1/projects/project-1/requirements',
    });
    const detail = await app.inject({
      method: 'GET',
      url: '/api/v1/projects/project-1/requirements/requirement-1',
    });

    expect(list.statusCode).toBe(200);
    expect(list.json()).toHaveLength(1);
    expect(detail.statusCode).toBe(200);
    expect(detail.json()).toMatchObject({ id: 'requirement-1', version: 1 });
  });

  it('存在しない要件には404を返す', async () => {
    const app = createApp({
      getById: () =>
        Promise.reject(new NotFoundError('Requirement', 'missing')),
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/projects/project-1/requirements/missing',
    });

    expect(response.statusCode).toBe(404);
  });

  it('要件一覧と詳細の内部エラーを安全な500へ変換する', async () => {
    const app = createApp({
      list: () => Promise.reject(new Error('secret')),
      getById: () => Promise.reject(new Error('secret')),
    });

    const list = await app.inject({
      method: 'GET',
      url: '/api/v1/projects/project-1/requirements',
    });
    const detail = await app.inject({
      method: 'GET',
      url: '/api/v1/projects/project-1/requirements/requirement-1',
    });

    expect(list.statusCode).toBe(500);
    expect(detail.statusCode).toBe(500);
    expect(detail.body).not.toContain('secret');
  });

  it('要件の保存と削除をApplication Serviceへ委譲する', async () => {
    const app = createApp({
      saveDraft: () => Promise.resolve(requirement),
      delete: () => Promise.resolve(),
    });

    const saved = await app.inject({
      method: 'POST',
      url: '/api/v1/projects/project-1/requirements',
      payload: {
        title: '音声入力',
        description: '移動中に入力する',
        acceptanceCriteria: [],
        sourceDocumentIds: ['document-1'],
      },
    });
    const deleted = await app.inject({
      method: 'DELETE',
      url: '/api/v1/projects/project-1/requirements/requirement-1',
    });

    expect(saved.statusCode).toBe(201);
    expect(deleted.statusCode).toBe(204);
  });

  it('参照資料のValidationErrorを400へ変換する', async () => {
    const app = createApp({
      saveDraft: () =>
        Promise.reject(new ValidationError('参照可能な資料ではありません')),
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/projects/project-1/requirements',
      payload: {
        title: '音声入力',
        description: '移動中に入力する',
        acceptanceCriteria: [],
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it('要件のシミュレーション一覧を返す', async () => {
    const mockSimulation = {
      id: 'sim-1',
      projectId: 'project-1',
      requirementId: 'requirement-1',
      requirementVersion: 1,
      requirementSnapshot: {
        title: '音声入力',
        description: '移動中に入力する',
        acceptanceCriteria: [],
      },
      personaSnapshots: [],
      status: 'completed',
      model: 'gemini-2.5-flash',
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
    };

    const mockReaction = {
      simulationId: 'sim-1',
      personaId: 'persona-1',
      personaSnapshot: { id: 'persona-1', name: 'ユーザーA' },
      status: 'completed',
      sentiment: 'positive',
      shortFeedback: '良い',
      detailedFeedback: '使いやすいです',
      workImage: '',
      concerns: [],
      createdAt: new Date('2026-01-01T00:00:00Z'),
    };

    const app = createApp(
      {
        getById: () => Promise.resolve(requirement),
      },
      {
        list: () => Promise.resolve([mockSimulation as unknown as Simulation]),
        getDetail: () =>
          Promise.resolve({
            simulation: mockSimulation as unknown as Simulation,
            reactions: [mockReaction as unknown as PersonaReaction],
          }),
      },
    );

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/projects/project-1/requirements/requirement-1/simulations',
    });

    expect(response.statusCode).toBe(200);
    const json: Array<{
      id: string;
      reactions: Array<{ sentiment: string }>;
    }> = response.json();
    expect(json).toHaveLength(1);
    const firstSim = json[0];
    expect(firstSim).toBeDefined();
    expect(firstSim?.id).toBe('sim-1');
    expect(firstSim?.reactions).toHaveLength(1);
    expect(firstSim?.reactions?.[0]?.sentiment).toBe('positive');
  });

  it('要件を承認するPATCHエンドポイント', async () => {
    const app = createApp({
      approveDraft: () =>
        Promise.resolve({ ...requirement, status: 'approved' }),
    });

    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/projects/project-1/requirements/requirement-1/approve',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      id: 'requirement-1',
      status: 'approved',
    });
  });
});
