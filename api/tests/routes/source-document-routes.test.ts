import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { sourceDocumentRoutes } from '../../src/routes/source-document-routes.js';
import type { SourceDocumentService } from '../../src/application/source-document/source-document-service.js';

describe('参照資料ルーター', () => {
  let app: FastifyInstance;
  let mockSourceDocumentService: Partial<SourceDocumentService>;

  beforeEach(() => {
    mockSourceDocumentService = {
      getDocumentsByProjectId: vi.fn().mockResolvedValue([]),
      addSourceDocument: vi.fn().mockResolvedValue({
        id: 'doc-1',
        projectId: 'project-1',
        type: 'url',
        reference: 'https://example.com',
        fetchStatus: 'success',
        contentSnapshot: 'Example Domain',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      deleteDocument: vi.fn().mockResolvedValue(undefined),
    };

    app = Fastify();
    void app.register(sourceDocumentRoutes, {
      sourceDocumentService: mockSourceDocumentService as SourceDocumentService,
    });
  });

  it('プロジェクトの参照資料一覧を返す', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/projects/project-1/source-documents',
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ documents: [] });
  });

  it('参照資料を登録して201を返す', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/projects/project-1/source-documents',
      payload: {
        type: 'url',
        reference: 'https://example.com',
      },
    });
    expect(response.statusCode).toBe(201);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const body = response.json();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(body.id).toBe('doc-1');
  });

  it('必須項目がない参照資料を400で拒否する', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/projects/project-1/source-documents',
      payload: {},
    });
    expect(response.statusCode).toBe(400);
  });

  it('プロジェクトに紐づく参照資料を削除する', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: '/api/v1/projects/project-1/source-documents/doc-1',
    });
    expect(response.statusCode).toBe(204);
    expect(mockSourceDocumentService.deleteDocument).toHaveBeenCalledWith(
      'project-1',
      'doc-1',
    );
  });
});
