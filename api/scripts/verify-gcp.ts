import { loadConfig } from '../src/config.js';
import { createGcpConnectivityService } from '../src/services/gcp-connectivity-service.js';
import { AdkVertexAiHealthService } from '../src/services/vertex-ai-health-service.js';

const config = loadConfig();
const connectivity = createGcpConnectivityService({
  bucketName: config.UPLOADS_BUCKET,
  projectId: config.GOOGLE_CLOUD_PROJECT,
});

async function verifyVertexAi(): Promise<void> {
  await new AdkVertexAiHealthService({
    model: config.VERTEX_AI_MODEL,
  }).check();
}

const checks = [
  ['Firestore', () => connectivity.verifyFirestore()],
  ['Cloud Storage', () => connectivity.verifyStorage()],
  ['Vertex AI', verifyVertexAi],
] as const;

for (const [name, check] of checks) {
  process.stdout.write(`${name}: checking... `);
  await check();
  process.stdout.write('ok\n');
}
