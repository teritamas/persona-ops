import type { FastifyPluginAsync } from 'fastify';
import type { SourceDocumentService } from '../application/source-document/source-document-service.js';
import type { SourceDocumentType } from '../domain/source-document/source-document.js';

interface SourceDocumentRoutesOptions {
  sourceDocumentService: SourceDocumentService;
}

export const sourceDocumentRoutes: FastifyPluginAsync<
  SourceDocumentRoutesOptions
> = async (fastify, options) => {
  await Promise.resolve();
  const { sourceDocumentService } = options;

  fastify.get<{
    Params: { projectId: string };
  }>('/api/v1/projects/:projectId/source-documents', async (request, reply) => {
    const { projectId } = request.params;
    const documents =
      await sourceDocumentService.getDocumentsByProjectId(projectId);
    return reply.send({ documents });
  });

  fastify.post<{
    Params: { projectId: string };
    Body: { type: SourceDocumentType; reference: string };
  }>('/api/v1/projects/:projectId/source-documents', async (request, reply) => {
    const { projectId } = request.params;
    const { type, reference } = request.body;

    if (!type || !reference) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'type and reference are required',
        },
      });
    }

    const document = await sourceDocumentService.addSourceDocument({
      projectId,
      type,
      reference,
    });

    return reply.status(201).send(document);
  });

  fastify.delete<{
    Params: { projectId: string; documentId: string };
  }>(
    '/api/v1/projects/:projectId/source-documents/:documentId',
    async (request, reply) => {
      const { documentId } = request.params;
      await sourceDocumentService.deleteDocument(documentId);
      return reply.status(204).send();
    },
  );
};
