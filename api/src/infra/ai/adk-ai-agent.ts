import { randomUUID } from 'node:crypto';

import { InMemoryRunner, LlmAgent } from '@google/adk';

import { type AiAgentPort } from '../../application/ports/ai-agent-port.js';

type AgentEvent = {
  content?: {
    parts?: Array<{
      text?: string;
    }>;
  };
};

export interface AgentRunner {
  runEphemeral(input: {
    newMessage: {
      parts: Array<{ text: string }>;
      role: 'user';
    };
    runConfig?: {
      maxLlmCalls?: number;
    };
    userId: string;
  }): AsyncGenerator<AgentEvent, void, undefined>;
}

export class AdkAiAgent implements AiAgentPort {
  readonly #runner: AgentRunner;

  constructor({ model, runner }: { model: string; runner?: AgentRunner }) {
    this.#runner =
      runner ??
      new InMemoryRunner({
        agent: new LlmAgent({
          description: 'A generic AI agent built with Vertex AI.',
          instruction: 'ユーザーの指示に従い、適切な応答を返してください。',
          model,
          name: 'generic_ai_agent',
        }),
        appName: 'persona_ops_ai',
      });
  }

  async invoke(
    prompt: string,
    options?: { timeoutMs?: number },
  ): Promise<string> {
    const events = this.#runner.runEphemeral({
      newMessage: {
        parts: [{ text: prompt }],
        role: 'user',
      },
      runConfig: {
        maxLlmCalls: 1,
      },
      userId: `invoke-${randomUUID()}`,
    });

    const timeoutMs = options?.timeoutMs ?? 30_000;
    let timeout: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => {
        reject(new Error('AI Agent invocation timed out.'));
      }, timeoutMs);
    });

    try {
      return await Promise.race([
        this.#consumeResponse(events),
        timeoutPromise,
      ]);
    } finally {
      if (timeout !== undefined) {
        clearTimeout(timeout);
      }
      void events.return(undefined);
    }
  }

  async #consumeResponse(
    events: AsyncGenerator<AgentEvent, void, undefined>,
  ): Promise<string> {
    let fullResponse = '';
    for await (const event of events) {
      const parts = event.content?.parts ?? [];
      for (const part of parts) {
        if (typeof part.text === 'string' && part.text.length > 0) {
          fullResponse += part.text;
        }
      }
    }

    if (fullResponse.length === 0) {
      throw new Error('Vertex AI returned no text response.');
    }
    return fullResponse;
  }
}
