import type { FastifyInstance } from 'fastify';

import type { ProjectService } from '../application/project-service.js';
import { NotFoundError } from '../domain/errors.js';
import type { Message, Project } from '../domain/project.js';
import { registerDomainErrorHandler } from './domain-error-handler.js';

const PROJECT_ROUTE_PREFIX = '/api/v1/projects';

const messageSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'role', 'text', 'time'],
  properties: {
    id: { type: 'string', minLength: 1, maxLength: 128 },
    role: {
      type: 'string',
      enum: ['user', 'agent', 'persona', 'system', 'proposal'],
    },
    text: { type: 'string', maxLength: 100_000 },
    time: { type: 'string', maxLength: 32 },
    isSystem: { type: 'boolean' },
    proposal: {
      type: 'object',
      additionalProperties: false,
      required: ['buttonText', 'inputText'],
      properties: {
        buttonText: { type: 'string', minLength: 1, maxLength: 200 },
        inputText: { type: 'string', minLength: 1, maxLength: 1000 },
        style: { type: 'string', maxLength: 32 },
      },
    },
  },
} as const;

const projectResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'name', 'createdAt', 'updatedAt', 'chats', 'activeChatId'],
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    chats: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'title', 'messages'],
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          type: { type: 'string', enum: ['agent', 'persona'] },
          personaId: { type: 'string' },
          messages: { type: 'array', items: messageSchema },
        },
      },
    },
    activeChatId: { type: ['string', 'null'] },
  },
} as const;

const projectSummaryResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'name', 'createdAt', 'updatedAt'],
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
} as const;

const projectIdParamsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['projectId'],
  properties: {
    projectId: { type: 'string', minLength: 1, maxLength: 128 },
  },
} as const;

const chatParamsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['projectId', 'chatId'],
  properties: {
    projectId: { type: 'string', minLength: 1, maxLength: 128 },
    chatId: { type: 'string', minLength: 1, maxLength: 128 },
  },
} as const;

function toProjectResponse(project: Project) {
  return {
    ...project,
    chats: project.chats ?? [],
    activeChatId: project.activeChatId ?? null,
  };
}

// eslint-disable-next-line @typescript-eslint/require-await
export async function projectRoutes(
  app: FastifyInstance,
  options: { projectService: ProjectService },
): Promise<void> {
  registerDomainErrorHandler(app);
  const { projectService } = options;

  app.get(
    PROJECT_ROUTE_PREFIX,
    {
      schema: {
        response: {
          200: {
            type: 'array',
            items: projectSummaryResponseSchema,
          },
        },
      },
    },
    async (_request, reply) => {
      const projects = await projectService.getAllProjects();
      return reply.status(200).send(
        projects.map(({ id, name, createdAt, updatedAt }) => ({
          id,
          name,
          createdAt,
          updatedAt,
        })),
      );
    },
  );

  app.get(
    `${PROJECT_ROUTE_PREFIX}/:projectId`,
    {
      schema: {
        params: projectIdParamsSchema,
        response: { 200: projectResponseSchema },
      },
    },
    async (request, reply) => {
      const { projectId } = request.params as { projectId: string };
      const project = await projectService.getProjectById(projectId);
      if (!project) {
        throw new NotFoundError('Project', projectId);
      }
      return reply.send(toProjectResponse(project));
    },
  );

  app.post(
    PROJECT_ROUTE_PREFIX,
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 120 },
          },
        },
        response: { 201: projectResponseSchema },
      },
    },
    async (request, reply) => {
      const { name } = request.body as { name: string };
      const project = await projectService.createProject(name);
      return reply.status(201).send(toProjectResponse(project));
    },
  );

  app.put(
    `${PROJECT_ROUTE_PREFIX}/:projectId`,
    {
      schema: {
        params: projectIdParamsSchema,
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 120 },
          },
        },
        response: { 200: projectResponseSchema },
      },
    },
    async (request, reply) => {
      const { projectId } = request.params as { projectId: string };
      const { name } = request.body as { name: string };
      const project = await projectService.updateProjectName(projectId, name);
      return reply.send(toProjectResponse(project));
    },
  );

  app.post(
    `${PROJECT_ROUTE_PREFIX}/:projectId/chats`,
    {
      schema: {
        params: projectIdParamsSchema,
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['title', 'type'],
          properties: {
            title: { type: 'string', minLength: 1, maxLength: 120 },
            type: { type: 'string', enum: ['agent', 'persona'] },
            personaId: { type: 'string', minLength: 1, maxLength: 128 },
            initialMessages: {
              type: 'array',
              maxItems: 10,
              items: messageSchema,
            },
          },
        },
        response: { 201: projectResponseSchema },
      },
    },
    async (request, reply) => {
      const { projectId } = request.params as { projectId: string };
      const body = request.body as {
        title: string;
        type: 'agent' | 'persona';
        personaId?: string;
        initialMessages?: Message[];
      };
      const project = await projectService.createChat(projectId, body);
      return reply.status(201).send(toProjectResponse(project));
    },
  );

  app.put(
    `${PROJECT_ROUTE_PREFIX}/:projectId/active-chat`,
    {
      schema: {
        params: projectIdParamsSchema,
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['chatId'],
          properties: {
            chatId: { type: 'string', minLength: 1, maxLength: 128 },
          },
        },
        response: { 200: projectResponseSchema },
      },
    },
    async (request, reply) => {
      const { projectId } = request.params as { projectId: string };
      const { chatId } = request.body as { chatId: string };
      const project = await projectService.setActiveChat(projectId, chatId);
      return reply.send(toProjectResponse(project));
    },
  );

  app.post(
    `${PROJECT_ROUTE_PREFIX}/:projectId/chats/:chatId/messages`,
    {
      schema: {
        params: chatParamsSchema,
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['messages'],
          properties: {
            messages: {
              type: 'array',
              minItems: 1,
              maxItems: 10,
              items: messageSchema,
            },
          },
        },
        response: { 200: projectResponseSchema },
      },
    },
    async (request, reply) => {
      const { projectId, chatId } = request.params as {
        projectId: string;
        chatId: string;
      };
      const { messages } = request.body as { messages: Message[] };
      const project = await projectService.appendChatMessages(
        projectId,
        chatId,
        messages,
      );
      return reply.send(toProjectResponse(project));
    },
  );

  app.delete(
    `${PROJECT_ROUTE_PREFIX}/:projectId`,
    { schema: { params: projectIdParamsSchema } },
    async (request, reply) => {
      const { projectId } = request.params as { projectId: string };
      await projectService.deleteProject(projectId);
      return reply.status(204).send();
    },
  );
}
