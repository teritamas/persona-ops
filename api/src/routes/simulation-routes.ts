import type { FastifyInstance } from 'fastify';

import type { SimulationService } from '../application/simulation-service.js';
import { NotFoundError } from '../domain/errors.js';
import type { PersonaReaction, Simulation } from '../domain/simulation.js';

const projectParamsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['projectId'],
  properties: { projectId: { type: 'string', minLength: 1 } },
} as const;

const simulationParamsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['projectId', 'simulationId'],
  properties: {
    projectId: { type: 'string', minLength: 1 },
    simulationId: { type: 'string', minLength: 1 },
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
  app.get(
    '/api/v1/projects/:projectId/simulations',
    { schema: { params: projectParamsSchema } },
    async (request, reply) => {
      try {
        const { projectId } = request.params as { projectId: string };
        const simulations = await options.simulationService.list(projectId);
        return reply.send(simulations.map(toSimulationResponse));
      } catch (error) {
        request.log.error({ err: error }, 'Failed to list simulations');
        return reply.status(500).send({ error: 'Internal Server Error' });
      }
    },
  );

  app.get(
    '/api/v1/projects/:projectId/simulations/:simulationId',
    { schema: { params: simulationParamsSchema } },
    async (request, reply) => {
      try {
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
      } catch (error) {
        if (error instanceof NotFoundError) {
          return reply.status(404).send({ error: 'Simulation not found' });
        }
        request.log.error({ err: error }, 'Failed to get simulation');
        return reply.status(500).send({ error: 'Internal Server Error' });
      }
    },
  );
}
