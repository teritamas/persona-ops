import type { FastifyInstance } from 'fastify';
import type { PersonaService } from '../application/persona-service.js';

const ROUTE_PREFIX = '/api/v1/projects/:projectId/personas';

const personaResponseSchema = {
  type: 'object',
  required: [
    'id',
    'projectId',
    'name',
    'role',
    'traits',
    'background',
    'avatarSeed',
    'x',
    'y',
    'createdAt',
    'updatedAt',
  ],
  properties: {
    id: { type: 'string' },
    projectId: { type: 'string' },
    name: { type: 'string' },
    role: { type: 'string' },
    traits: {
      type: 'array',
      items: { type: 'string' },
    },
    background: { type: 'string' },
    avatarSeed: { type: 'string' },
    x: { type: 'number' },
    y: { type: 'number' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
} as const;

const generatePersonaBodySchema = {
  type: 'object',
  required: ['promptText'],
  properties: {
    promptText: { type: 'string', minLength: 1 },
  },
} as const;

const projectIdParamsSchema = {
  type: 'object',
  required: ['projectId'],
  properties: {
    projectId: { type: 'string' },
  },
} as const;

const errorResponseSchema = {
  type: 'object',
  required: ['error'],
  properties: {
    error: { type: 'string' },
  },
} as const;

// eslint-disable-next-line @typescript-eslint/require-await
export async function personaRoutes(
  app: FastifyInstance,
  options: { personaService: PersonaService },
): Promise<void> {
  const { personaService } = options;

  // GET /api/v1/projects/:projectId/personas
  app.get(
    ROUTE_PREFIX,
    {
      schema: {
        params: projectIdParamsSchema,
        response: {
          200: {
            type: 'array',
            items: personaResponseSchema,
          },
          500: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const { projectId } = request.params as { projectId: string };
        const personas = await personaService.getPersonasByProjectId(projectId);
        return reply.status(200).send(personas);
      } catch (error: unknown) {
        request.log.error({ err: error }, 'Failed to get personas');
        return reply.status(500).send({ error: 'Internal Server Error' });
      }
    },
  );

  // POST /api/v1/projects/:projectId/personas/generate
  app.post(
    `${ROUTE_PREFIX}/generate`,
    {
      schema: {
        params: projectIdParamsSchema,
        body: generatePersonaBodySchema,
        response: {
          201: {
            type: 'array',
            items: personaResponseSchema,
          },
          500: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const { projectId } = request.params as { projectId: string };
        const { promptText } = request.body as { promptText: string };

        const personas = await personaService.generatePersonas(
          projectId,
          promptText,
        );
        return reply.status(201).send(personas);
      } catch (error: unknown) {
        request.log.error({ err: error }, 'Failed to generate personas');
        return reply.status(500).send({
          error:
            error instanceof Error ? error.message : 'Internal Server Error',
        });
      }
    },
  );
}
