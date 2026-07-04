import type { FastifyInstance } from 'fastify';

import type { RequirementService } from '../application/requirement-service.js';
import { NotFoundError } from '../domain/errors.js';
import type { Requirement } from '../domain/requirement.js';

const projectParamsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['projectId'],
  properties: { projectId: { type: 'string', minLength: 1 } },
} as const;

const requirementParamsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['projectId', 'requirementId'],
  properties: {
    projectId: { type: 'string', minLength: 1 },
    requirementId: { type: 'string', minLength: 1 },
  },
} as const;

function toRequirementResponse(requirement: Requirement) {
  return {
    ...requirement,
    approvedAt: requirement.approvedAt?.toISOString(),
    createdAt: requirement.createdAt.toISOString(),
    updatedAt: requirement.updatedAt.toISOString(),
  };
}

// eslint-disable-next-line @typescript-eslint/require-await
export async function requirementRoutes(
  app: FastifyInstance,
  options: { requirementService: RequirementService },
): Promise<void> {
  app.get(
    '/api/v1/projects/:projectId/requirements',
    { schema: { params: projectParamsSchema } },
    async (request, reply) => {
      try {
        const { projectId } = request.params as { projectId: string };
        const requirements = await options.requirementService.list(projectId);
        return reply.send(requirements.map(toRequirementResponse));
      } catch (error) {
        request.log.error({ err: error }, 'Failed to list requirements');
        return reply.status(500).send({ error: 'Internal Server Error' });
      }
    },
  );

  app.get(
    '/api/v1/projects/:projectId/requirements/:requirementId',
    { schema: { params: requirementParamsSchema } },
    async (request, reply) => {
      try {
        const { projectId, requirementId } = request.params as {
          projectId: string;
          requirementId: string;
        };
        const requirement = await options.requirementService.getById(
          projectId,
          requirementId,
        );
        return reply.send(toRequirementResponse(requirement));
      } catch (error) {
        if (error instanceof NotFoundError) {
          return reply.status(404).send({ error: 'Requirement not found' });
        }
        request.log.error({ err: error }, 'Failed to get requirement');
        return reply.status(500).send({ error: 'Internal Server Error' });
      }
    },
  );
}
