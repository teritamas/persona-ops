import Fastify, {
  type FastifyInstance,
  type FastifyServerOptions,
} from 'fastify';

import type { Container } from './infra/container.js';
import { healthRoutes } from './routes/health-routes.js';
import { projectRoutes } from './routes/project-routes.js';
import { personaRoutes } from './routes/persona-routes.js';
import { chatRoutes } from './routes/chat-routes.js';
import { type AppConfig } from './config.js';

/**
 * Fastify アプリケーションを構築する
 *
 * Why: app.ts の責務はルートプラグインの登録のみとする。
 * DI コンテナの構築は infra/container.ts の buildContainer() が担い、
 * ここでは受け取ったコンテナを各プラグインに注入するだけにする。
 */
export function buildApp({
  config,
  container,
  logger = true,
}: {
  config: AppConfig;
  container: Container;
  logger?: FastifyServerOptions['logger'];
}): FastifyInstance {
  const app = Fastify({ logger });

  void app.register(healthRoutes, {
    aiAgent: container.aiAgent,
    model: config.VERTEX_AI_MODEL,
  });

  void app.register(projectRoutes, {
    projectService: container.projectService,
  });

  void app.register(personaRoutes, {
    personaService: container.personaService,
  });

  void app.register(chatRoutes, {
    defaultModel: config.VERTEX_AI_MODEL,
    personaOpsAgent: container.personaOpsAgent,
  });

  return app;
}
