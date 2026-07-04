import type { FastifyInstance } from 'fastify';
import type { ProjectService } from '../application/project-service.js';
import type { Chat } from '../domain/project.js';

const PROJECT_ROUTE_PREFIX = '/api/v1/projects';

const projectResponseSchema = {
  type: 'object',
  required: ['id', 'name', 'createdAt', 'updatedAt'],
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    chats: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'title', 'messages'],
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          type: { type: 'string' },
          personaId: { type: 'string' },
          messages: {
            type: 'array',
            items: {
              type: 'object',
              required: ['id', 'role', 'text', 'time'],
              properties: {
                id: { type: 'string' },
                role: { type: 'string' },
                text: { type: 'string' },
                time: { type: 'string' },
                isSystem: { type: 'boolean' },
              },
            },
          },
        },
      },
    },
    activeChatId: { type: ['string', 'null'] },
  },
} as const;

const createProjectBodySchema = {
  type: 'object',
  required: ['name'],
  properties: {
    name: { type: 'string', minLength: 1 },
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
          500: errorResponseSchema,
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
          500: errorResponseSchema,
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

  app.put(
    `${PROJECT_ROUTE_PREFIX}/:id`,
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            chats: { type: 'array' },
            activeChatId: { type: ['string', 'null'] },
          },
        },
        response: {
          200: projectResponseSchema,
          404: errorResponseSchema,
          500: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = request.body as {
          name?: string;
          chats?: Chat[];
          activeChatId?: string | null;
        };
        const project = await projectService.getProjectById(id);
        if (!project) {
          return reply.status(404).send({ error: 'Project not found' });
        }
        if (body.name !== undefined) project.name = body.name;
        if (body.chats !== undefined) project.chats = body.chats;
        if (body.activeChatId !== undefined)
          project.activeChatId = body.activeChatId;

        await projectService.updateProject(project);
        return reply.status(200).send(project);
      } catch (error: unknown) {
        request.log.error({ err: error }, 'Failed to update project');
        return reply.status(500).send({ error: 'Internal Server Error' });
      }
    },
  );

  app.delete(
    `${PROJECT_ROUTE_PREFIX}/:id`,
    {
      schema: {
        response: {
          204: { type: 'null' },
          500: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        await projectService.deleteProject(id);
        return reply.status(204).send();
      } catch (error: unknown) {
        request.log.error({ err: error }, 'Failed to delete project');
        return reply.status(500).send({ error: 'Internal Server Error' });
      }
    },
  );
}
