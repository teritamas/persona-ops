import { randomUUID } from 'node:crypto';

import { InMemoryRunner, LlmAgent } from '@google/adk';

import type {
  PersonaOpsAgentInput,
  PersonaOpsAgentPort,
} from '../../application/ports/agents/persona-ops-agent-port.js';
import type { PersonaService } from '../../application/persona-service.js';
import type { RequirementService } from '../../application/requirement-service.js';
import type { SimulationService } from '../../application/simulation-service.js';
import { PERSONA_OPS_AGENT_INSTRUCTION } from './instructions.js';
import { createApproveRequirementAndRequestSimulationTool } from './tools/approve-requirement-and-request-simulation-tool.js';
import { createFetchDocumentTool } from './tools/fetch-document-tool.js';
import { createSavePersonasTool } from './tools/save-personas-tool.js';
import { createSaveRequirementTool } from './tools/save-requirement-tool.js';
import type { SourceDocumentService } from '../../application/source-document/source-document-service.js';

export class AdkPersonaOpsAgent implements PersonaOpsAgentPort {
  constructor(
    private readonly model: string,
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
        createApproveRequirementAndRequestSimulationTool(
          input.projectId,
          this.simulationService,
        ),
        createFetchDocumentTool(this.sourceDocumentService),
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

    for await (const event of events) {
      for (const part of event.content?.parts ?? []) {
        if (typeof part.text === 'string' && part.text.length > 0) {
          yield part.text;
        }
      }
    }
  }

  private buildPrompt(input: PersonaOpsAgentInput): string {
    return [
      '<project-context-data>',
      JSON.stringify({
        projectId: input.projectId,
        personas: input.personas,
        requirements: input.requirements,
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
