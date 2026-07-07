import { randomUUID } from 'node:crypto';

import { InMemoryRunner, LlmAgent, getFunctionCalls } from '@google/adk';

import type {
  PersonaOpsAgentInput,
  PersonaOpsAgentPort,
} from '../../application/ports/agents/persona-ops-agent-port.js';
import type { PersonaService } from '../../application/persona-service.js';
import type { ProjectService } from '../../application/project-service.js';
import type { RequirementService } from '../../application/requirement-service.js';
import type { SimulationService } from '../../application/simulation-service.js';
import { PERSONA_OPS_AGENT_INSTRUCTION } from './instructions.js';
import { createApproveRequirementTool } from './tools/approve-requirement-tool.js';
import { createRequestSimulationTool } from './tools/request-simulation-tool.js';
import { createFetchDocumentTool } from './tools/fetch-document-tool.js';
import { createSavePersonasTool } from './tools/save-personas-tool.js';
import { createSaveRequirementTool } from './tools/save-requirement-tool.js';
import { createUpdateProjectNameTool } from './tools/update-project-name-tool.js';
import type { SourceDocumentService } from '../../application/source-document/source-document-service.js';
import { buildSystemActionTagsForExecutedTools } from './system-action-tags.js';

export class AdkPersonaOpsAgent implements PersonaOpsAgentPort {
  constructor(
    private readonly model: string,
    private readonly projectService: ProjectService,
    private readonly personaService: PersonaService,
    private readonly requirementService: RequirementService,
    private readonly simulationService: SimulationService,
    private readonly sourceDocumentService: SourceDocumentService,
  ) {}

  async *stream(input: PersonaOpsAgentInput): AsyncIterable<string> {
    const agent = new LlmAgent({
      name: 'persona_ops_agent',
      description:
        'ペルソナ作成、要件定義、シミュレーション開始を支援するAgent',
      instruction: PERSONA_OPS_AGENT_INSTRUCTION,
      model: this.model,
      tools: [
        createSavePersonasTool(input.projectId, this.personaService),
        createSaveRequirementTool(input.projectId, this.requirementService),
        createApproveRequirementTool(input.projectId, this.requirementService),
        createRequestSimulationTool(input.projectId, this.simulationService),
        createFetchDocumentTool(input.projectId, this.sourceDocumentService),
        createUpdateProjectNameTool(input.projectId, this.projectService),
      ],
    });
    const runner = new InMemoryRunner({
      agent,
      appName: 'persona_ops_ai',
    });

    const prompt = this.buildPrompt(input);
    const events = runner.runEphemeral({
      newMessage: {
        parts: [{ text: prompt }],
        role: 'user',
      },
      runConfig: { maxLlmCalls: 5 },
      userId: `persona-ops-${randomUUID()}`,
    });

    const executedTools = new Set<string>();

    for await (const event of events) {
      const functionCalls = getFunctionCalls(event);
      for (const call of functionCalls) {
        if (call.name) {
          executedTools.add(call.name);
        }
      }

      for (const part of event.content?.parts ?? []) {
        if (typeof part.text === 'string' && part.text.length > 0) {
          yield part.text;
        }
      }
    }

    const tags = buildSystemActionTagsForExecutedTools(executedTools);
    if (tags.length > 0) {
      yield '\n' + tags.join('\n');
    }
  }

  private buildPrompt(input: PersonaOpsAgentInput): string {
    return [
      '<project-context-data>',
      JSON.stringify({
        projectId: input.projectId,
        projectName: input.projectName,
        personas: input.personas,
        requirements: input.requirements,
        sourceDocuments: input.sourceDocuments.map((document) => ({
          id: document.id,
          type: document.type,
          reference: document.reference,
          contentSnapshot: document.contentSnapshot,
        })),
        recentSimulations: input.recentSimulations.map((simulation) => ({
          id: simulation.id,
          requirementId: simulation.requirementId,
          requirementTitle: simulation.requirementSnapshot.title,
          status: simulation.status,
          summary: simulation.summary,
        })),
      }),
      '</project-context-data>',
      '<conversation-history>',
      JSON.stringify(input.history),
      '</conversation-history>',
      '<user-message>',
      input.message,
      '</user-message>',
    ].join('\n');
  }
}
