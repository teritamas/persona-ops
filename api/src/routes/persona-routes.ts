import type { FastifyInstance } from 'fastify';

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
}
