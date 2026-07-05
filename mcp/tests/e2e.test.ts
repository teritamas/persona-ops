import { describe, expect, it, vi } from 'vitest';
import { ApiClient } from '../src/api-client.js';
import { createServer } from '../src/server.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { AddressInfo } from 'net';

interface TextContent {
  type: 'text';
  text: string;
}

describe('MCP Server E2E', () => {
  it('should initialize, list tools, and call tools', async () => {
    const mockApiClient = new ApiClient('http://localhost:3001');
    mockApiClient.listProjects = vi
      .fn()
      .mockResolvedValue([{ id: 'p1', name: 'Project 1' }]);

    mockApiClient.getRequirement = vi.fn().mockResolvedValue({
      title: '音声入力機能',
      description: 'スマホで音声をテキストに変換する',
      acceptanceCriteria: ['一文字も間違えずに変換できること'],
    });

    mockApiClient.getRequirementSimulations = vi.fn().mockResolvedValue([
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

    const app = createServer(mockApiClient);
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
    const markdown = evalContent[0]?.text ?? '';
    expect(markdown).toContain('音声入力機能');
    expect(markdown).toContain('とても使いやすい');
    expect(markdown).toContain('騒がしい場所での認識精度');

    server.close();
  });

  it('should support multiple concurrent client sessions', async () => {
    const mockApiClient = new ApiClient('http://localhost:3001');
    mockApiClient.listProjects = vi
      .fn()
      .mockResolvedValue([{ id: 'p1', name: 'Project 1' }]);

    const app = createServer(mockApiClient);
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
