import { randomUUID } from 'node:crypto';

import { InMemoryRunner, LlmAgent } from '@google/adk';

import type {
  PersonaSimulationAgentPort,
  SimulationAgentResult,
} from '../../application/ports/agents/persona-simulation-agent-port.js';
import { buildSimulationInstruction } from './instructions.js';
import { simulationReactionSchema } from './reaction-schema.js';

type AgentEvent = {
  content?: { parts?: Array<{ text?: string }> };
};

export interface SimulationAgentRunner {
  runEphemeral(input: {
    newMessage: { parts: Array<{ text: string }>; role: 'user' };
    runConfig: { maxLlmCalls: number };
    userId: string;
  }): AsyncGenerator<AgentEvent, void, undefined>;
}

export class AdkPersonaSimulationAgent implements PersonaSimulationAgentPort {
  constructor(
    private readonly model: string,
    private readonly createRunner: (
      agent: LlmAgent,
    ) => SimulationAgentRunner = (agent) =>
      new InMemoryRunner({
        agent,
        appName: 'persona_ops_simulation',
      }),
    private readonly timeoutMs = 45_000,
  ) {}

  async simulate(
    input: Parameters<PersonaSimulationAgentPort['simulate']>[0],
  ): Promise<SimulationAgentResult> {
    const runner = this.createRunner(
      new LlmAgent({
        name: 'persona_simulation_agent',
        description: 'AIペルソナとして新機能要件を評価するAgent',
        instruction: buildSimulationInstruction(
          input.persona,
          input.isDesignatedNegative,
        ),
        model: this.model,
        outputSchema: simulationReactionSchema,
      }),
    );
    const events = runner.runEphemeral({
      newMessage: {
        parts: [
          {
            text: `<requirement-data>${JSON.stringify(input.requirement)}</requirement-data>`,
          },
        ],
        role: 'user',
      },
      runConfig: { maxLlmCalls: 1 },
      userId: `simulation-${randomUUID()}`,
    });

    let timeout: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => {
        reject(new Error('Simulation agent invocation timed out.'));
      }, this.timeoutMs);
    });

    let response: string;
    try {
      response = await Promise.race([
        this.consumeResponse(events),
        timeoutPromise,
      ]);
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
      void events.return(undefined);
    }
    if (response.length === 0) {
      throw new Error('Simulation agent returned an empty response.');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(response);
    } catch {
      throw new Error('Simulation agent returned invalid JSON.');
    }
    return simulationReactionSchema.parse(parsed);
  }

  private async consumeResponse(
    events: AsyncGenerator<AgentEvent, void, undefined>,
  ): Promise<string> {
    let response = '';
    for await (const event of events) {
      for (const part of event.content?.parts ?? []) {
        if (typeof part.text === 'string') {
          response += part.text;
        }
      }
    }
    return response;
  }
}
