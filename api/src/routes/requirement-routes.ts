import type { FastifyInstance } from 'fastify';

import type { RequirementService } from '../application/requirement-service.js';
import type { SimulationService } from '../application/simulation-service.js';
import type { Simulation } from '../domain/simulation.js';
import type { Requirement } from '../domain/requirement.js';
import { registerDomainErrorHandler } from './domain-error-handler.js';

const projectParamsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['projectId'],
  properties: { projectId: { type: 'string', minLength: 1, maxLength: 128 } },
} as const;

const requirementParamsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['projectId', 'requirementId'],
  properties: {
    projectId: { type: 'string', minLength: 1, maxLength: 128 },
    requirementId: { type: 'string', minLength: 1, maxLength: 128 },
  },
} as const;

const saveRequirementBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'description', 'acceptanceCriteria'],
  properties: {
    id: { type: 'string', minLength: 1, maxLength: 128 },
    title: { type: 'string', minLength: 1, maxLength: 200 },
    description: { type: 'string', minLength: 1, maxLength: 20_000 },
    acceptanceCriteria: {
      type: 'array',
      maxItems: 100,
      items: { type: 'string', minLength: 1, maxLength: 2_000 },
    },
    sourceDocumentIds: {
      type: 'array',
      maxItems: 100,
      items: { type: 'string', minLength: 1, maxLength: 128 },
    },
    sourceSimulationIds: {
      type: 'array',
      maxItems: 100,
      items: { type: 'string', minLength: 1, maxLength: 128 },
    },
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

function toSimulationResponse(simulation: Simulation) {
  return {
    ...simulation,
    leaseExpiresAt: simulation.leaseExpiresAt?.toISOString(),
    createdAt: simulation.createdAt.toISOString(),
    startedAt: simulation.startedAt?.toISOString(),
    completedAt: simulation.completedAt?.toISOString(),
  };
}

// eslint-disable-next-line @typescript-eslint/require-await
export async function requirementRoutes(
  app: FastifyInstance,
  options: {
    requirementService: RequirementService;
    simulationService: SimulationService;
  },
): Promise<void> {
  registerDomainErrorHandler(app);

  app.get(
    '/api/v1/projects/:projectId/requirements',
    { schema: { params: projectParamsSchema } },
    async (request, reply) => {
      const { projectId } = request.params as { projectId: string };
      const requirements = await options.requirementService.list(projectId);
      return reply.send(requirements.map(toRequirementResponse));
    },
  );

  app.get(
    '/api/v1/projects/:projectId/requirements/:requirementId',
    { schema: { params: requirementParamsSchema } },
    async (request, reply) => {
      const { projectId, requirementId } = request.params as {
        projectId: string;
        requirementId: string;
      };
      const requirement = await options.requirementService.getById(
        projectId,
        requirementId,
      );
      return reply.send(toRequirementResponse(requirement));
    },
  );

  app.get(
    '/api/v1/projects/:projectId/requirements/:requirementId/simulations',
    { schema: { params: requirementParamsSchema } },
    async (request, reply) => {
      const { projectId, requirementId } = request.params as {
        projectId: string;
        requirementId: string;
      };
      const simulations = await options.simulationService.list(projectId);
      const relatedSimulations = simulations.filter(
        (sim) => sim.requirementId === requirementId,
      );

      const response = await Promise.all(
        relatedSimulations.map(async (sim) => {
          const detail = await options.simulationService.getDetail(
            projectId,
            sim.id,
          );
          return {
            ...toSimulationResponse(detail.simulation),
            reactions: detail.reactions.map((r) => {
              if (r.status === 'completed') {
                return {
                  ...r,
                  createdAt: r.createdAt.toISOString(),
                };
              }
              return {
                simulationId: r.simulationId,
                personaId: r.personaId,
                personaSnapshot: r.personaSnapshot,
                status: r.status,
                errorCode: r.errorCode,
                createdAt: r.createdAt.toISOString(),
              };
            }),
          };
        }),
      );

      return reply.send(response);
    },
  );

  app.post(
    '/api/v1/projects/:projectId/requirements',
    {
      schema: { params: projectParamsSchema, body: saveRequirementBodySchema },
    },
    async (request, reply) => {
      const { projectId } = request.params as { projectId: string };
      const body = request.body as {
        id?: string;
        title: string;
        description: string;
        acceptanceCriteria: string[];
        sourceDocumentIds?: string[];
        sourceSimulationIds?: string[];
      };
      const requirement = await options.requirementService.saveDraft(
        projectId,
        body,
      );
      return reply.status(201).send(toRequirementResponse(requirement));
    },
  );

  app.delete(
    '/api/v1/projects/:projectId/requirements/:requirementId',
    { schema: { params: requirementParamsSchema } },
    async (request, reply) => {
      const { projectId, requirementId } = request.params as {
        projectId: string;
        requirementId: string;
      };
      await options.requirementService.delete(projectId, requirementId);
      return reply.status(204).send();
    },
  );

  app.patch(
    '/api/v1/projects/:projectId/requirements/:requirementId/approve',
    { schema: { params: requirementParamsSchema } },
    async (request, reply) => {
      const { projectId, requirementId } = request.params as {
        projectId: string;
        requirementId: string;
      };
      const requirement = await options.requirementService.approveDraft(
        projectId,
        requirementId,
      );
      return reply.send(toRequirementResponse(requirement));
    },
  );
}
