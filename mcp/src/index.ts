import { ApiClient } from './api-client.js';
import { createServer } from './server.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8090;
const PRIVATE_API_URL = process.env.PRIVATE_API_URL || 'http://localhost:8080';

const apiClient = new ApiClient(PRIVATE_API_URL);

const start = () => {
  const server = createServer(apiClient);
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
