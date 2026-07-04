import type { FastifyInstance } from 'fastify';

import type { SimulationService } from '../../application/simulation-service.js';
import { NotFoundError } from '../../domain/errors.js';

const simulationParamsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['projectId', 'simulationId'],
  properties: {
    projectId: { type: 'string', minLength: 1 },
    simulationId: { type: 'string', minLength: 1 },
  },
} as const;

// eslint-disable-next-line @typescript-eslint/require-await
export async function internalSimulationRoutes(
  app: FastifyInstance,
  options: { simulationService: SimulationService },
): Promise<void> {
  app.post(
    '/api/v1/internal/projects/:projectId/simulations/:simulationId/run',
    { schema: { params: simulationParamsSchema } },
    async (request, reply) => {
      const startedAt = Date.now();
      const { projectId, simulationId } = request.params as {
        projectId: string;
        simulationId: string;
      };
      request.log.info(
        { projectId, simulationId },
        'Simulation task execution started',
      );

      try {
        const result = await options.simulationService.run(
          projectId,
          simulationId,
        );
        if (result === 'busy') {
          request.log.warn(
            { durationMs: Date.now() - startedAt, projectId, simulationId },
            'Simulation task execution skipped because the lease is active',
          );
          return reply.status(409).send({ error: 'Simulation is running' });
        }

        let resultContext: Record<string, unknown> = {};
        try {
          const { simulation } = await options.simulationService.getDetail(
            projectId,
            simulationId,
          );
          resultContext = {
            failureCount: simulation.failureCount,
            status: simulation.status,
            successCount: simulation.successCount,
            targetCount: simulation.targetCount,
          };
        } catch (error) {
          // Logging enrichment must not turn a completed, idempotent task into a retry.
          request.log.warn(
            { err: error, projectId, simulationId },
            'Simulation result summary could not be loaded for logging',
          );
        }
        request.log.info(
          {
            durationMs: Date.now() - startedAt,
            projectId,
            ...resultContext,
            simulationId,
          },
          'Simulation task execution finished',
        );
        return reply.status(204).send();
      } catch (error) {
        if (error instanceof NotFoundError) {
          request.log.warn(
            { durationMs: Date.now() - startedAt, projectId, simulationId },
            'Simulation task was not found',
          );
          return reply.status(404).send({ error: 'Simulation not found' });
        }
        request.log.error(
          {
            durationMs: Date.now() - startedAt,
            err: error,
            projectId,
            simulationId,
          },
          'Simulation task execution failed',
        );
        return reply.status(500).send({ error: 'Internal Server Error' });
      }
    },
  );
}
