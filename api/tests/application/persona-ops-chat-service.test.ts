import { describe, expect, it, vi } from 'vitest';

import { PersonaOpsChatService } from '../../src/application/persona-ops-chat-service.js';
import type { PersonaOpsAgentPort } from '../../src/application/ports/agents/persona-ops-agent-port.js';
import type { PersonaService } from '../../src/application/persona-service.js';
import type { RequirementService } from '../../src/application/requirement-service.js';
import type { SimulationService } from '../../src/application/simulation-service.js';
import type { SourceDocumentService } from '../../src/application/source-document/source-document-service.js';
import type { ProjectService } from '../../src/application/project-service.js';

describe('PersonaOpsチャットサービス', () => {
  it('保存済み資料を含むプロジェクトContextをAgentへ渡す', async () => {
    const stream = vi.fn(async function* () {
      yield await Promise.resolve('応答');
    });
    const agent = { stream } as unknown as PersonaOpsAgentPort;
    const service = new PersonaOpsChatService(
      {
        getPersonasByProjectId: () => Promise.resolve([]),
      } as unknown as PersonaService,
      {
        list: () => Promise.resolve([]),
      } as unknown as RequirementService,
      {
        list: () => Promise.resolve([]),
      } as unknown as SimulationService,
      {
        getReusableContext: () =>
          Promise.resolve([
            {
              id: 'document-1',
              projectId: 'project-1',
              type: 'url',
              reference: 'https://example.com',
              fetchStatus: 'success',
              contentSnapshot: '過去に保存した資料',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ]),
      } as unknown as SourceDocumentService,
      {
        getProjectById: () => Promise.resolve({ name: 'Test Project' }),
      } as unknown as ProjectService,
      agent,
    );

    const response = await service.stream({
      projectId: 'project-1',
      message: '資料を使ってください',
      history: [],
    });

    const chunks: string[] = [];
    for await (const chunk of response) {
      chunks.push(chunk);
    }
    expect(chunks).toEqual(['応答']);
    expect(stream).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceDocuments: [expect.objectContaining({ id: 'document-1' })],
      }),
    );
  });
});
