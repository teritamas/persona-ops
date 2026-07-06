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

describe('Requirement Tools E2Eテスト', () => {
  it('list_requirements および get_requirement_with_simulations ツールが正常に機能すること', async () => {
    const mockHttpClient = new HttpClient('http://localhost:3001');
    const mockProjectApiClient = new ProjectApiClient(mockHttpClient);
    const mockRequirementApiClient = new RequirementApiClient(mockHttpClient);
    const mockSimulationApiClient = new SimulationApiClient(mockHttpClient);
    const mockHealthApiClient = new HealthApiClient(mockHttpClient);

    mockRequirementApiClient.listRequirements = vi.fn().mockResolvedValue([
      { id: 'req1', title: '音声入力機能', status: 'approved' },
      { id: 'req2', title: 'ドラフト要件', status: 'draft' },
    ]);

    mockRequirementApiClient.getRequirement = vi.fn().mockResolvedValue({
      title: '音声入力機能',
      description: 'スマホで音声をテキストに変換する',
      acceptanceCriteria: ['一文字も間違えずに変換できること'],
      status: 'approved',
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

    // list_requirements の検証 (デフォルト: approved のみ)
    const listResponse = await client.callTool({
      name: 'list_requirements',
      arguments: { projectId: 'p1' },
    });
    expect(listResponse.isError).toBeFalsy();
    const listContent = listResponse.content as TextContent[];
    expect(listContent[0]?.text).toContain(
      '音声入力機能 (ID: req1, Status: approved)',
    );
    expect(listContent[0]?.text).not.toContain(
      'ドラフト要件 (ID: req2, Status: draft)',
    );

    // list_requirements の検証 (includeDraft: true)
    const listResponseWithDraft = await client.callTool({
      name: 'list_requirements',
      arguments: { projectId: 'p1', includeDraft: true },
    });
    expect(listResponseWithDraft.isError).toBeFalsy();
    const listContentWithDraft = listResponseWithDraft.content as TextContent[];
    expect(listContentWithDraft[0]?.text).toContain(
      '音声入力機能 (ID: req1, Status: approved)',
    );
    expect(listContentWithDraft[0]?.text).toContain(
      'ドラフト要件 (ID: req2, Status: draft)',
    );

    // get_requirement_with_simulations の検証
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

    await client.close();
    server.close();
  });

  it('save_requirement_draft ツールが正常に要件ドラフトを保存・更新できること', async () => {
    const mockHttpClient = new HttpClient('http://localhost:3001');
    const mockProjectApiClient = new ProjectApiClient(mockHttpClient);
    const mockRequirementApiClient = new RequirementApiClient(mockHttpClient);
    const mockSimulationApiClient = new SimulationApiClient(mockHttpClient);
    const mockHealthApiClient = new HealthApiClient(mockHttpClient);

    mockRequirementApiClient.saveRequirementDraft = vi.fn().mockResolvedValue({
      id: 'req2',
      title: '要件ドラフト',
      description: '要件ドラフトの説明文',
      acceptanceCriteria: ['受入基準1'],
      status: 'draft',
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

    const saveResponse = await client.callTool({
      name: 'save_requirement_draft',
      arguments: {
        projectId: 'p1',
        title: '要件ドラフト',
        description: '要件ドラフトの説明文',
        acceptanceCriteria: ['受入基準1'],
      },
    });
    expect(saveResponse.isError).toBeFalsy();
    const saveContent = saveResponse.content as TextContent[];
    expect(saveContent[0]?.text).toContain(
      'Requirement draft saved successfully.',
    );
    expect(saveContent[0]?.text).toContain('ID: req2');

    await client.close();
    server.close();
  });
});
