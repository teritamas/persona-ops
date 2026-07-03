import Fastify, {
  type FastifyInstance,
  type FastifyServerOptions,
} from 'fastify';

import type { VertexAiHealthService } from './services/vertex-ai-health-service.js';

const healthResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['status'],
  properties: {
    status: { type: 'string', const: 'ok' },
  },
} as const;

const vertexHealthResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['latencyMs', 'model', 'service', 'status'],
  properties: {
    latencyMs: { type: 'number', minimum: 0 },
    model: { type: 'string' },
    service: { type: 'string', const: 'vertexai' },
    status: { type: 'string', const: 'ok' },
  },
} as const;

const vertexHealthErrorSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['code', 'service', 'status'],
  properties: {
    code: { type: 'string', const: 'VERTEX_AI_UNAVAILABLE' },
    service: { type: 'string', const: 'vertexai' },
    status: { type: 'string', const: 'error' },
  },
} as const;

export function buildApp({
  logger = true,
  model,
  vertexAiHealthService,
}: {
  logger?: FastifyServerOptions['logger'];
  model: string;
  vertexAiHealthService: VertexAiHealthService;
}): FastifyInstance {
  const app = Fastify({ logger });

  app.get(
    '/healthz',
    {
      schema: {
        response: {
          200: healthResponseSchema,
        },
      },
    },
    () => ({ status: 'ok' as const }),
  );

  app.get(
    '/healthz/vertexai',
    {
      schema: {
        response: {
          200: vertexHealthResponseSchema,
          503: vertexHealthErrorSchema,
        },
      },
    },
    async (request, reply) => {
      const startedAt = performance.now();

      try {
        await vertexAiHealthService.check();
        return {
          latencyMs: Math.round(performance.now() - startedAt),
          model,
          service: 'vertexai' as const,
          status: 'ok' as const,
        };
      } catch (error: unknown) {
        request.log.error({ err: error }, 'Vertex AI health check failed.');
        return reply.status(503).send({
          code: 'VERTEX_AI_UNAVAILABLE' as const,
          service: 'vertexai' as const,
          status: 'error' as const,
        });
      }
    },
  );

  return app;
}
