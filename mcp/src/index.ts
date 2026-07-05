import { ApiClient } from './api-client.js';
import { createServer, createMcpServer } from './server.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8090;
const PRIVATE_API_URL = process.env.PRIVATE_API_URL || 'http://localhost:8080';
const TRANSPORT = process.env.MCP_TRANSPORT || 'sse';

const apiClient = new ApiClient(PRIVATE_API_URL);

const start = async () => {
  if (TRANSPORT === 'stdio') {
    const mcpServer = createMcpServer(apiClient);
    const transport = new StdioServerTransport();
    await mcpServer.server.connect(transport);
    console.error('MCP Server running on stdio');
  } else {
    const app = createServer(apiClient);
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`MCP Server running on port ${PORT}`);
    });
  }
};

start().catch((err) => {
  console.error('Fatal error starting MCP Server:', err);
  process.exit(1);
});
