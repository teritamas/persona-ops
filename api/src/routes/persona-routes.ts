import type { FastifyInstance } from 'fastify';

import { NotFoundError } from '../domain/errors.js';
import type { PersonaService } from '../application/persona-service.js';

// eslint-disable-next-line @typescript-eslint/require-await
export async function personaRoutes(
  app: FastifyInstance,
  options: { personaService: PersonaService },
): Promise<void> {
  app.get(
    '/api/v1/projects/:projectId/personas',
    {
      schema: {
        params: {
          type: 'object',
          required: ['projectId'],
          properties: { projectId: { type: 'string', minLength: 1 } },
        },
      },
    },
    async (request, reply) => {
      try {
        const { projectId } = request.params as { projectId: string };
        const personas =
          await options.personaService.getPersonasByProjectId(projectId);
        return reply.send(personas);
      } catch (error) {
        request.log.error({ err: error }, 'Failed to get personas');
        return reply.status(500).send({ error: 'Internal Server Error' });
      }
    },
  );

  app.post(
    '/api/v1/projects/:projectId/personas/:personaId/position',
    {
      schema: {
        params: {
          type: 'object',
          required: ['projectId', 'personaId'],
          properties: {
            projectId: { type: 'string', minLength: 1 },
            personaId: { type: 'string', minLength: 1 },
          },
        },
        body: {
          type: 'object',
          required: ['x', 'y'],
          properties: {
            x: { type: 'number' },
            y: { type: 'number' },
          },
        },
      },
    },
    async (request, reply) => {
      try {
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
      } catch (error) {
        request.log.error({ err: error }, 'Failed to update persona position');
        if (error instanceof NotFoundError) {
          return reply.status(404).send({ error: error.message });
        }
        return reply.status(500).send({ error: 'Internal Server Error' });
      }
    },
  );
}
