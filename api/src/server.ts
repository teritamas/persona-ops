import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { buildContainer } from './infra/container.js';

const config = loadConfig();
const container = buildContainer(config);
const app = buildApp({ config, container, logger: { level: config.LOG_LEVEL } });

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
