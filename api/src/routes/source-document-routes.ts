import type { FastifyInstance } from 'fastify';

import type { SourceDocumentService } from '../application/source-document/source-document-service.js';
import type { SourceDocumentType } from '../domain/source-document/source-document.js';
import { registerDomainErrorHandler } from './domain-error-handler.js';

const projectParamsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['projectId'],
  properties: {
    projectId: { type: 'string', minLength: 1, maxLength: 128 },
  },
} as const;

const documentParamsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['projectId', 'documentId'],
  properties: {
    projectId: { type: 'string', minLength: 1, maxLength: 128 },
    documentId: { type: 'string', minLength: 1, maxLength: 128 },
  },
} as const;

// eslint-disable-next-line @typescript-eslint/require-await
export async function sourceDocumentRoutes(
  app: FastifyInstance,
  options: { sourceDocumentService: SourceDocumentService },
): Promise<void> {
  registerDomainErrorHandler(app);
  const { sourceDocumentService } = options;

  app.get(
    '/api/v1/projects/:projectId/source-documents',
    { schema: { params: projectParamsSchema } },
    async (request, reply) => {
      const { projectId } = request.params as { projectId: string };
      const documents =
        await sourceDocumentService.getDocumentsByProjectId(projectId);
      return reply.send({ documents });
    },
  );

  app.post(
    '/api/v1/projects/:projectId/source-documents',
    {
      schema: {
        params: projectParamsSchema,
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['type', 'reference'],
          properties: {
            type: { type: 'string', enum: ['url', 'chat'] },
            reference: { type: 'string', minLength: 1, maxLength: 10_000 },
          },
        },
      },
    },
    async (request, reply) => {
      const { projectId } = request.params as { projectId: string };
      const { type, reference } = request.body as {
        type: SourceDocumentType;
        reference: string;
      };
      const document = await sourceDocumentService.addSourceDocument({
        projectId,
        type,
        reference,
      });
      return reply.status(201).send(document);
    },
  );

  app.delete(
    '/api/v1/projects/:projectId/source-documents/:documentId',
    { schema: { params: documentParamsSchema } },
    async (request, reply) => {
      const { projectId, documentId } = request.params as {
        projectId: string;
        documentId: string;
      };
      await sourceDocumentService.deleteDocument(projectId, documentId);
      return reply.status(204).send();
    },
  );
}
