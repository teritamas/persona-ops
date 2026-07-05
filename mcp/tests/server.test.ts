import { describe, expect, it, vi } from 'vitest';
import { HttpClient } from '../src/api/http-client.js';
import { ProjectApiClient } from '../src/api/project-api-client.js';
import { RequirementApiClient } from '../src/api/requirement-api-clients.js';
import { SimulationApiClient } from '../src/api/simulation-api-client.js';
import { PersonaApiClient } from '../src/api/persona-api-client.js';
import { HealthApiClient } from '../src/api/health-api-client.js';
import { createServer } from '../src/server.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { AddressInfo } from 'net';

describe('MCPサーバー セッション管理およびヘルスチェックテスト', () => {
  it('複数のクライアントセッションが並行して正しく処理されること', async () => {
    const mockHttpClient = new HttpClient('http://localhost:3001');
    const mockProjectApiClient = new ProjectApiClient(mockHttpClient);
    const mockRequirementApiClient = new RequirementApiClient(mockHttpClient);
    const mockSimulationApiClient = new SimulationApiClient(mockHttpClient);
    const mockPersonaApiClient = new PersonaApiClient(mockHttpClient);
    const mockHealthApiClient = new HealthApiClient(mockHttpClient);

    mockProjectApiClient.listProjects = vi
      .fn()
      .mockResolvedValue([{ id: 'p1', name: 'Project 1' }]);

    const app = createServer(
      mockProjectApiClient,
      mockRequirementApiClient,
      mockSimulationApiClient,
      mockPersonaApiClient,
      mockHealthApiClient,
    );
    const server = app.listen(0);
    const address = server.address() as AddressInfo;
    const port = address.port;

    const url = new URL(`http://localhost:${port}/mcp`);

    // Create client A
    const transportA = new StreamableHTTPClientTransport(url);
    const clientA = new Client(
      { name: 'client-a', version: '1.0.0' },
      { capabilities: {} },
    );
    await clientA.connect(transportA);

    // Create client B
    const transportB = new StreamableHTTPClientTransport(url);
    const clientB = new Client(
      { name: 'client-b', version: '1.0.0' },
      { capabilities: {} },
    );
    await clientB.connect(transportB);

    // Both should be able to run queries
    const toolsA = await clientA.listTools();
    const toolsB = await clientB.listTools();
    expect(toolsA.tools).toHaveLength(7);
    expect(toolsB.tools).toHaveLength(7);

    // Close both
    await clientA.close();
    await clientB.close();
    server.close();
  });

  it('ヘルスチェックエンドポイントが正常に応答すること', async () => {
    const mockHttpClient = new HttpClient('http://localhost:3001');
    const mockProjectApiClient = new ProjectApiClient(mockHttpClient);
    const mockRequirementApiClient = new RequirementApiClient(mockHttpClient);
    const mockSimulationApiClient = new SimulationApiClient(mockHttpClient);
    const mockPersonaApiClient = new PersonaApiClient(mockHttpClient);
    const mockHealthApiClient = new HealthApiClient(mockHttpClient);

    const app = createServer(
      mockProjectApiClient,
      mockRequirementApiClient,
      mockSimulationApiClient,
      mockPersonaApiClient,
      mockHealthApiClient,
    );
    const server = app.listen(0);
    const address = server.address() as AddressInfo;
    const port = address.port;

    // Test: health check endpoint (success)
    mockHealthApiClient.checkHealth = vi.fn().mockResolvedValue(true);
    const healthRes = await fetch(`http://localhost:${port}/health`);
    expect(healthRes.status).toBe(200);
    const healthJson = (await healthRes.json()) as { status: string };
    expect(healthJson.status).toBe('ok');

    // Test: health check endpoint (failure)
    mockHealthApiClient.checkHealth = vi.fn().mockResolvedValue(false);
    const healthFailRes = await fetch(`http://localhost:${port}/health`);
    expect(healthFailRes.status).toBe(500);
    const healthFailJson = (await healthFailRes.json()) as { status: string };
    expect(healthFailJson.status).toBe('error');

    server.close();
  });
});
