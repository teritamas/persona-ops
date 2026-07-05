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

describe('Persona Tools E2Eテスト', () => {
  it('list_personas ツールが正常にペルソナ一覧を返却すること', async () => {
    const mockHttpClient = new HttpClient('http://localhost:3001');
    const mockProjectApiClient = new ProjectApiClient(mockHttpClient);
    const mockRequirementApiClient = new RequirementApiClient(mockHttpClient);
    const mockSimulationApiClient = new SimulationApiClient(mockHttpClient);
    const mockPersonaApiClient = new PersonaApiClient(mockHttpClient);
    const mockHealthApiClient = new HealthApiClient(mockHttpClient);

    mockPersonaApiClient.listPersonas = vi.fn().mockResolvedValue([
      {
        id: 'pers1',
        projectId: 'p1',
        name: '山田太郎',
        age: 30,
        role: 'エンジニア',
        traits: ['真面目', '几帳面'],
        background: '10年の開発経験を持つシニアデベロッパー。',
        x: 10,
        y: 20,
      },
    ]);

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

    const personaResponse = await client.callTool({
      name: 'list_personas',
      arguments: {
        projectId: 'p1',
      },
    });
    expect(personaResponse.isError).toBeFalsy();
    const personaContent = personaResponse.content as TextContent[];
    expect(personaContent[0]?.text).toContain('ペルソナ一覧');
    expect(personaContent[0]?.text).toContain('山田太郎 (年齢: 30)');
    expect(personaContent[0]?.text).toContain('エンジニア');
    expect(personaContent[0]?.text).toContain('真面目, 几帳面');
    expect(personaContent[0]?.text).toContain(
      '10年の開発経験を持つシニアデベロッパー。',
    );

    await client.close();
    server.close();
  });
});
