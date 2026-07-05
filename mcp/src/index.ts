import { HttpClient } from './api/http-client.js';
import { ProjectApiClient } from './api/project-api-client.js';
import { RequirementApiClient } from './api/requirement-api-clients.js';
import { HealthApiClient } from './api/health-api-client.js';
import { createServer } from './server.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8090;
const PRIVATE_API_URL = process.env.PRIVATE_API_URL || 'http://localhost:8080';
const API_AUTH_MODE = (process.env.API_AUTH_MODE || 'none') as
  'google-id-token' | 'none';

const httpClient = new HttpClient(PRIVATE_API_URL, API_AUTH_MODE);
const projectApiClient = new ProjectApiClient(httpClient);
const requirementApiClient = new RequirementApiClient(httpClient);
const healthApiClient = new HealthApiClient(httpClient);

const start = () => {
  const server = createServer(
    projectApiClient,
    requirementApiClient,
    healthApiClient,
  );
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`MCP Server running on port ${PORT}`);
  });
};

try {
  start();
} catch (err) {
  console.error('Fatal error starting MCP Server:', err);
  process.exit(1);
}
