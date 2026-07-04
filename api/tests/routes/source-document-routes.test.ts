import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { sourceDocumentRoutes } from '../../src/routes/source-document-routes.js';
import type { SourceDocumentService } from '../../src/application/source-document/source-document-service.js';

describe('SourceDocumentRoutes', () => {
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

  it('GET /api/v1/projects/:projectId/source-documents returns empty array', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/projects/project-1/source-documents',
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ documents: [] });
  });

  it('POST /api/v1/projects/:projectId/source-documents returns 201', async () => {
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

  it('POST /api/v1/projects/:projectId/source-documents missing payload returns 400', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/projects/project-1/source-documents',
      payload: {},
    });
    expect(response.statusCode).toBe(400);
  });

  it('DELETE /api/v1/projects/:projectId/source-documents/:documentId returns 204', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: '/api/v1/projects/project-1/source-documents/doc-1',
    });
    expect(response.statusCode).toBe(204);
  });
});
