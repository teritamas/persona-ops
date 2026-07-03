import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { AdkVertexAiHealthService } from './services/vertex-ai-health-service.js';

const config = loadConfig();
const app = buildApp({
  logger: {
    level: config.LOG_LEVEL,
  },
  model: config.VERTEX_AI_MODEL,
  vertexAiHealthService: new AdkVertexAiHealthService({
    model: config.VERTEX_AI_MODEL,
  }),
});

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  app.log.info({ signal }, 'Shutting down API server.');
  await app.close();
}

process.once('SIGINT', () => {
  void shutdown('SIGINT');
});
process.once('SIGTERM', () => {
  void shutdown('SIGTERM');
});

try {
  await app.listen({
    host: config.HOST,
    port: config.PORT,
  });
} catch (error: unknown) {
  app.log.fatal({ err: error }, 'Failed to start API server.');
  process.exitCode = 1;
}
