import type { FastifyInstance } from 'fastify';

import type { PersonaService } from '../application/persona-service.js';
import { registerDomainErrorHandler } from './domain-error-handler.js';

// eslint-disable-next-line @typescript-eslint/require-await
export async function personaRoutes(
  app: FastifyInstance,
  options: { personaService: PersonaService },
): Promise<void> {
  registerDomainErrorHandler(app);

  app.get(
    '/api/v1/projects/:projectId/personas',
    {
      schema: {
        params: {
          type: 'object',
          additionalProperties: false,
          required: ['projectId'],
          properties: {
            projectId: { type: 'string', minLength: 1, maxLength: 128 },
          },
        },
      },
    },
    async (request, reply) => {
      const { projectId } = request.params as { projectId: string };
      const personas =
        await options.personaService.getPersonasByProjectId(projectId);
      return reply.send(personas);
    },
  );

  app.post(
    '/api/v1/projects/:projectId/personas/:personaId/position',
    {
      schema: {
        params: {
          type: 'object',
          additionalProperties: false,
          required: ['projectId', 'personaId'],
          properties: {
            projectId: { type: 'string', minLength: 1, maxLength: 128 },
            personaId: { type: 'string', minLength: 1, maxLength: 128 },
          },
        },
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['x', 'y'],
          properties: {
            x: { type: 'number', minimum: 0, maximum: 100 },
            y: { type: 'number', minimum: 0, maximum: 100 },
          },
        },
      },
    },
    async (request, reply) => {
      const { projectId, personaId } = request.params as {
        projectId: string;
        personaId: string;
      };
      const { x, y } = request.body as { x: number; y: number };
      const updated = await options.personaService.updatePersonaPosition(
        projectId,
        personaId,
        x,
        y,
      );
      return reply.send(updated);
    },
  );
}
