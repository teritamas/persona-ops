import { loadConfig } from '../src/config.js';
import { createDatabaseConnectivityService } from '../src/infra/database/database-connectivity-service.js';
import { createStorageConnectivityService } from '../src/infra/storage/storage-connectivity-service.js';
import { AdkAiAgent } from '../src/infra/ai/adk-ai-agent.js';

const config = loadConfig();

const database = createDatabaseConnectivityService({
  projectId: config.GOOGLE_CLOUD_PROJECT,
});

const storage = createStorageConnectivityService({
  bucketName: config.UPLOADS_BUCKET,
  projectId: config.GOOGLE_CLOUD_PROJECT,
});

async function verifyVertexAi(): Promise<void> {
  const agent = new AdkAiAgent({
    model: config.VERTEX_AI_MODEL,
  });
  await agent.invoke('接続確認です。「ok」の2文字だけを小文字で返してください。', {
    timeoutMs: 15_000,
  });
}

const checks = [
  ['Firestore (Database)', () => database.check()],
  ['Cloud Storage', () => storage.check()],
  ['Vertex AI', verifyVertexAi],
] as const;

for (const [name, check] of checks) {
  process.stdout.write(`${name}: checking... `);
  await check();
  process.stdout.write('ok\n');
}
