import { describe, expect, it, vi } from 'vitest';
import { HttpClient } from '../../src/api/http-client.js';
import { ProjectApiClient } from '../../src/api/project-api-client.js';
import { RequirementApiClient } from '../../src/api/requirement-api-clients.js';
import { SimulationApiClient } from '../../src/api/simulation-api-client.js';
import { PersonaApiClient } from '../../src/api/persona-api-client.js';
import { HealthApiClient } from '../../src/api/health-api-client.js';
import { createServer } from '../../src/server.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { AddressInfo } from 'net';

interface TextContent {
  type: 'text';
  text: string;
}

describe('Project Tools E2Eテスト', () => {
  it('list_projects ツールが正常にプロジェクト一覧を返却すること', async () => {
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

    const transport = new StreamableHTTPClientTransport(
      new URL(`http://localhost:${port}/mcp`),
    );
    const client = new Client(
      { name: 'test-client', version: '1.0.0' },
      { capabilities: {} },
    );
    await client.connect(transport);

    const projectResponse = await client.callTool({
      name: 'list_projects',
      arguments: {},
    });
    expect(projectResponse.isError).toBeFalsy();
    const projectContent = projectResponse.content as TextContent[];
    expect(projectContent[0]?.type).toBe('text');
    expect(projectContent[0]?.text).toContain('Project 1');

    await client.close();
    server.close();
  });
});
