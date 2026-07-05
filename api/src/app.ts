import Fastify, {
  type FastifyInstance,
  type FastifyServerOptions,
} from 'fastify';

import type { Container } from './infra/container.js';
import { healthRoutes } from './routes/health-routes.js';
import { projectRoutes } from './routes/project-routes.js';
import { personaRoutes } from './routes/persona-routes.js';
import { chatRoutes } from './routes/chat-routes.js';
import { requirementRoutes } from './routes/requirement-routes.js';
import { simulationRoutes } from './routes/simulation-routes.js';
import { internalSimulationRoutes } from './routes/internal/simulation-routes.js';
import { sourceDocumentRoutes } from './routes/source-document-routes.js';

/**
 * Fastify アプリケーションを構築する
 *
 * Why: app.ts の責務はルートプラグインの登録のみとする。
 * DI コンテナの構築は infra/container.ts の buildContainer() が担い、
 * ここでは受け取ったコンテナを各プラグインに注入するだけにする。
 */
export function buildApp({
  container,
  logger = true,
}: {
  container: Container;
  logger?: FastifyServerOptions['logger'];
}): FastifyInstance {
  const app = Fastify({ logger });

  void app.register(healthRoutes);

  void app.register(projectRoutes, {
    projectService: container.projectService,
  });

  void app.register(personaRoutes, {
    personaService: container.personaService,
  });

  void app.register(chatRoutes, {
    personaOpsChatService: container.personaOpsChatService,
  });

  void app.register(requirementRoutes, {
    requirementService: container.requirementService,
  });

  void app.register(simulationRoutes, {
    simulationService: container.simulationService,
  });

  void app.register(internalSimulationRoutes, {
    simulationService: container.simulationService,
  });

  void app.register(sourceDocumentRoutes, {
    sourceDocumentService: container.sourceDocumentService,
  });

  return app;
}
