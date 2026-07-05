import type { FastifyInstance } from 'fastify';

const HEALTH_ROUTE_PREFIX = '/api/v1';
const HEALTHZ_PATH = `${HEALTH_ROUTE_PREFIX}/healthz`;

const healthResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['status'],
  properties: {
    status: { type: 'string', const: 'ok' },
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
): Promise<void> {
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
}
