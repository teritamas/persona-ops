import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';

import type { RequirementService } from '../../src/application/requirement-service.js';
import { NotFoundError, ValidationError } from '../../src/domain/errors.js';
import type { Requirement } from '../../src/domain/requirement.js';
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

function createApp(service: Partial<RequirementService>) {
  const app = Fastify();
  void app.register(requirementRoutes, {
    requirementService: service as RequirementService,
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
});
