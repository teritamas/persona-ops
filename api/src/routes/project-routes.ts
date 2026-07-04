import type { FastifyInstance } from 'fastify';
import { ProjectService } from '../application/project-service.js';

const PROJECT_ROUTE_PREFIX = '/api/v1/projects';

const projectResponseSchema = {
  type: 'object',
  required: ['id', 'name', 'createdAt', 'updatedAt'],
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
} as const;

const createProjectBodySchema = {
  type: 'object',
  required: ['name'],
  properties: {
    name: { type: 'string', minLength: 1 },
  },
} as const;

export async function projectRoutes(
  app: FastifyInstance,
  options: { projectService: ProjectService },
): Promise<void> {
  const { projectService } = options;

  app.get(
    PROJECT_ROUTE_PREFIX,
    {
      schema: {
        response: {
          200: {
            type: 'array',
            items: projectResponseSchema,
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const projects = await projectService.getAllProjects();
        return reply.status(200).send(projects);
      } catch (error: unknown) {
        request.log.error({ err: error }, 'Failed to get projects');
        return reply.status(500).send({ error: 'Internal Server Error' });
      }
    },
  );

  app.post(
    PROJECT_ROUTE_PREFIX,
    {
      schema: {
        body: createProjectBodySchema,
        response: {
          201: projectResponseSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const { name } = request.body as { name: string };
        const project = await projectService.createProject(name);
        return reply.status(201).send(project);
      } catch (error: unknown) {
        request.log.error({ err: error }, 'Failed to create project');
        return reply.status(500).send({ error: 'Internal Server Error' });
      }
    },
  );
}
