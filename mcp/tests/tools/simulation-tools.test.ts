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

describe('Simulation Tools E2Eテスト', () => {
  it('request_persona_simulation および get_simulation_result ツールが正常に機能すること', async () => {
    const mockHttpClient = new HttpClient('http://localhost:3001');
    const mockProjectApiClient = new ProjectApiClient(mockHttpClient);
    const mockRequirementApiClient = new RequirementApiClient(mockHttpClient);
    const mockSimulationApiClient = new SimulationApiClient(mockHttpClient);
    const mockHealthApiClient = new HealthApiClient(mockHttpClient);

    // モック定義
    mockSimulationApiClient.requestSimulation = vi.fn().mockResolvedValue({
      id: 'sim2',
      projectId: 'p1',
      requirementId: 'req2',
      status: 'queued',
      reactions: [],
      createdAt: '2026-07-06T00:00:00Z',
    });

    mockSimulationApiClient.getSimulation = vi
      .fn()
      .mockResolvedValueOnce({
        id: 'sim2',
        projectId: 'p1',
        requirementId: 'req2',
        status: 'running',
        reactions: [],
        createdAt: '2026-07-06T00:00:00Z',
      })
      .mockResolvedValueOnce({
        id: 'sim2',
        projectId: 'p1',
        requirementId: 'req2',
        status: 'completed',
        reactions: [
          {
            personaSnapshot: { name: 'テストユーザー' },
            status: 'completed',
            sentiment: 'positive',
            shortFeedback: '良いですね。',
            detailedFeedback: '素晴らしい使い勝手です。',
            concerns: ['特になし'],
          },
        ],
        summary: '全体的に肯定的な反応です。',
        createdAt: '2026-07-06T00:00:00Z',
      });

    const mockPersonaApiClient = new PersonaApiClient(mockHttpClient);
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

    // 1. request_persona_simulation を呼び出す
    const simReqResponse = await client.callTool({
      name: 'request_persona_simulation',
      arguments: {
        projectId: 'p1',
        requirementId: 'req2',
      },
    });
    expect(simReqResponse.isError).toBeFalsy();
    const simReqContent = simReqResponse.content as TextContent[];
    expect(simReqContent[0]?.text).toContain(
      'Simulation requested successfully.',
    );
    expect(simReqContent[0]?.text).toContain('Simulation ID: sim2');

    // 2. get_simulation_result を呼び出す（実行中状態のテスト）
    const simResultRunningResponse = await client.callTool({
      name: 'get_simulation_result',
      arguments: {
        projectId: 'p1',
        simulationId: 'sim2',
      },
    });
    expect(simResultRunningResponse.isError).toBeFalsy();
    const simResultRunningContent =
      simResultRunningResponse.content as TextContent[];
    expect(simResultRunningContent[0]?.text).toContain(
      'Simulation is still in progress.',
    );

    // 3. get_simulation_result を呼び出す（完了状態のテスト）
    const simResultCompletedResponse = await client.callTool({
      name: 'get_simulation_result',
      arguments: {
        projectId: 'p1',
        simulationId: 'sim2',
      },
    });
    expect(simResultCompletedResponse.isError).toBeFalsy();
    const simResultCompletedContent =
      simResultCompletedResponse.content as TextContent[];
    expect(simResultCompletedContent[0]?.text).toContain(
      'シミュレーション結果 (ID: sim2)',
    );
    expect(simResultCompletedContent[0]?.text).toContain(
      'テストユーザー の反応',
    );
    expect(simResultCompletedContent[0]?.text).toContain(
      '**評価 (Sentiment)**: positive',
    );

    await client.close();
    server.close();
  });
});
