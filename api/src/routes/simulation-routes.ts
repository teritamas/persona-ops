import type { FastifyInstance } from 'fastify';

import type { SimulationService } from '../application/simulation-service.js';
import type { PersonaReaction, Simulation } from '../domain/simulation.js';
import { registerDomainErrorHandler } from './domain-error-handler.js';

const projectParamsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['projectId'],
  properties: { projectId: { type: 'string', minLength: 1, maxLength: 128 } },
} as const;

const simulationParamsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['projectId', 'simulationId'],
  properties: {
    projectId: { type: 'string', minLength: 1, maxLength: 128 },
    simulationId: { type: 'string', minLength: 1, maxLength: 128 },
  },
} as const;

const createSimulationBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['requirementId'],
  properties: {
    requirementId: { type: 'string', minLength: 1, maxLength: 128 },
  },
} as const;

function toSimulationResponse(simulation: Simulation) {
  return {
    ...simulation,
    leaseExpiresAt: simulation.leaseExpiresAt?.toISOString(),
    createdAt: simulation.createdAt.toISOString(),
    startedAt: simulation.startedAt?.toISOString(),
    completedAt: simulation.completedAt?.toISOString(),
  };
}

function toReactionResponse(reaction: PersonaReaction) {
  if (reaction.status === 'completed') {
    return {
      ...reaction,
      createdAt: reaction.createdAt.toISOString(),
    };
  }
  return {
    simulationId: reaction.simulationId,
    personaId: reaction.personaId,
    personaSnapshot: reaction.personaSnapshot,
    status: reaction.status,
    errorCode: reaction.errorCode,
    createdAt: reaction.createdAt.toISOString(),
  };
}

// eslint-disable-next-line @typescript-eslint/require-await
export async function simulationRoutes(
  app: FastifyInstance,
  options: { simulationService: SimulationService },
): Promise<void> {
  registerDomainErrorHandler(app);

  app.get(
    '/api/v1/projects/:projectId/simulations',
    { schema: { params: projectParamsSchema } },
    async (request, reply) => {
      const { projectId } = request.params as { projectId: string };
      const simulations = await options.simulationService.list(projectId);
      return reply.send(simulations.map(toSimulationResponse));
    },
  );

  app.get(
    '/api/v1/projects/:projectId/simulations/:simulationId',
    { schema: { params: simulationParamsSchema } },
    async (request, reply) => {
      const { projectId, simulationId } = request.params as {
        projectId: string;
        simulationId: string;
      };
      const detail = await options.simulationService.getDetail(
        projectId,
        simulationId,
      );
      return reply.send({
        ...toSimulationResponse(detail.simulation),
        reactions: detail.reactions.map(toReactionResponse),
      });
    },
  );

  app.post(
    '/api/v1/projects/:projectId/simulations',
    {
      schema: {
        params: projectParamsSchema,
        body: createSimulationBodySchema,
      },
    },
    async (request, reply) => {
      const { projectId } = request.params as { projectId: string };
      const { requirementId } = request.body as { requirementId: string };
      const simulation = await options.simulationService.request(
        projectId,
        requirementId,
      );
      return reply.status(201).send(toSimulationResponse(simulation));
    },
  );

  app.delete(
    '/api/v1/projects/:projectId/simulations/:simulationId',
    { schema: { params: simulationParamsSchema } },
    async (request, reply) => {
      const { projectId, simulationId } = request.params as {
        projectId: string;
        simulationId: string;
      };
      await options.simulationService.delete(projectId, simulationId);
      return reply.status(204).send();
    },
  );
}
