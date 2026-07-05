import type { FastifyInstance } from 'fastify';

import type { AiAgentPort } from '../application/ports/infra/ai/ai-agent-port.js';

const HEALTH_ROUTE_PREFIX = '/api/v1';
const HEALTHZ_PATH = `${HEALTH_ROUTE_PREFIX}/healthz`;
const VERTEX_AI_HEALTHZ_PATH = `${HEALTHZ_PATH}/vertexai`;

const healthResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['status'],
  properties: {
    status: { type: 'string', const: 'ok' },
  },
} as const;

const aiHealthResponseSchema = {
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

const aiHealthErrorSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['code', 'service', 'status'],
  properties: {
    code: { type: 'string', const: 'VERTEX_AI_UNAVAILABLE' },
    service: { type: 'string', const: 'vertexai' },
    status: { type: 'string', const: 'error' },
  },
} as const;

/**
 * ヘルスチェック用ルートプラグイン
 *
 * Why: app.ts からルート定義を分離してコントローラー層の責務を明確にする。
 */
// eslint-disable-next-line @typescript-eslint/require-await
export async function healthRoutes(
  app: FastifyInstance,
  options: {
    model: string;
    aiAgent: AiAgentPort;
  },
): Promise<void> {
  const { model, aiAgent } = options;

  app.get(
    HEALTHZ_PATH,
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
    VERTEX_AI_HEALTHZ_PATH,
    {
      schema: {
        response: {
          200: aiHealthResponseSchema,
          503: aiHealthErrorSchema,
        },
      },
    },
    async (request, reply) => {
      const startedAt = performance.now();

      try {
        // AIエージェントへの汎用ポートを利用してヘルスチェックのプロンプトを送信
        const response = await aiAgent.invoke(
          '接続確認です。「ok」の2文字だけを小文字で返してください。',
          { timeoutMs: 15_000 },
        );

        if (response.trim().toLowerCase() !== 'ok') {
          throw new Error(`Unexpected AI response: ${response}`);
        }

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
}
