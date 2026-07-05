import { describe, expect, it, vi } from 'vitest';
import { HttpClient } from '../src/api/http-client.js';
import { ProjectApiClient } from '../src/api/project-api-client.js';
import { RequirementApiClient } from '../src/api/requirement-api-clients.js';
import { HealthApiClient } from '../src/api/health-api-client.js';
import { createServer } from '../src/server.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { AddressInfo } from 'net';

interface TextContent {
  type: 'text';
  text: string;
}

describe('MCPサーバー E2Eテスト', () => {
  it('初期化、ツール一覧取得、ツールの実行が正常に行えること', async () => {
    const mockHttpClient = new HttpClient('http://localhost:3001');
    const mockProjectApiClient = new ProjectApiClient(mockHttpClient);
    const mockRequirementApiClient = new RequirementApiClient(mockHttpClient);
    const mockHealthApiClient = new HealthApiClient(mockHttpClient);

    mockProjectApiClient.listProjects = vi
      .fn()
      .mockResolvedValue([{ id: 'p1', name: 'Project 1' }]);

    mockRequirementApiClient.getRequirement = vi.fn().mockResolvedValue({
      title: '音声入力機能',
      description: 'スマホで音声をテキストに変換する',
      acceptanceCriteria: ['一文字も間違えずに変換できること'],
    });

    mockRequirementApiClient.getRequirementSimulations = vi
      .fn()
      .mockResolvedValue([
        {
          reactions: [
            {
              personaSnapshot: { name: 'ユーザーA' },
              status: 'completed',
              sentiment: 'positive',
              shortFeedback: 'とても使いやすい',
              detailedFeedback: '声だけで入力できるのは非常に助かります。',
              concerns: ['騒がしい場所での認識精度'],
            },
          ],
        },
      ]);

    const app = createServer(
      mockProjectApiClient,
      mockRequirementApiClient,
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

    // Test: list_tools
    const tools = await client.listTools();
    expect(tools.tools).toHaveLength(3);
    expect(tools.tools.map((t) => t.name)).toContain('list_projects');
    expect(tools.tools.map((t) => t.name)).toContain('list_requirements');
    expect(tools.tools.map((t) => t.name)).toContain(
      'get_requirement_with_simulations',
    );

    // Test: call list_projects
    const projectResponse = await client.callTool({
      name: 'list_projects',
      arguments: {},
    });
    expect(projectResponse.isError).toBeFalsy();
    const projectContent = projectResponse.content as TextContent[];
    expect(projectContent[0]?.type).toBe('text');
    expect(projectContent[0]?.text).toContain('Project 1');

    // Test: call get_requirement_with_simulations
    const evalResponse = await client.callTool({
      name: 'get_requirement_with_simulations',
      arguments: {
        projectId: 'p1',
        requirementId: 'req1',
      },
    });
    expect(evalResponse.isError).toBeFalsy();
    const evalContent = evalResponse.content as TextContent[];
    expect(evalContent[0]?.text ?? '').toContain('音声入力機能');
    expect(evalContent[0]?.text ?? '').toContain('とても使いやすい');
    expect(evalContent[0]?.text ?? '').toContain('騒がしい場所での認識精度');

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

  it('複数のクライアントセッションが並行して正しく処理されること', async () => {
    const mockHttpClient = new HttpClient('http://localhost:3001');
    const mockProjectApiClient = new ProjectApiClient(mockHttpClient);
    const mockRequirementApiClient = new RequirementApiClient(mockHttpClient);
    const mockHealthApiClient = new HealthApiClient(mockHttpClient);

    mockProjectApiClient.listProjects = vi
      .fn()
      .mockResolvedValue([{ id: 'p1', name: 'Project 1' }]);

    const app = createServer(
      mockProjectApiClient,
      mockRequirementApiClient,
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
    expect(toolsA.tools).toHaveLength(3);
    expect(toolsB.tools).toHaveLength(3);

    // Close both
    await clientA.close();
    await clientB.close();
    server.close();
  });
});
