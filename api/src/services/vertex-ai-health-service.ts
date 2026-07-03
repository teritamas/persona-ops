import { randomUUID } from 'node:crypto';

import { InMemoryRunner, LlmAgent } from '@google/adk';

const HEALTH_CHECK_PROMPT =
  '接続確認です。「ok」の2文字だけを小文字で返してください。';
const AGENT_INSTRUCTION =
  'あなたはVertex AIへの接続確認専用エージェントです。指示された短い応答だけを返してください。';

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

export interface VertexAiHealthService {
  check(): Promise<void>;
}

export class AdkVertexAiHealthService implements VertexAiHealthService {
  readonly #runner: AgentRunner;
  readonly #timeoutMs: number;

  constructor({
    model,
    runner,
    timeoutMs = 15_000,
  }: {
    model: string;
    runner?: AgentRunner;
    timeoutMs?: number;
  }) {
    this.#runner =
      runner ??
      new InMemoryRunner({
        agent: new LlmAgent({
          description: 'Checks connectivity to Vertex AI.',
          instruction: AGENT_INSTRUCTION,
          model,
          name: 'vertex_health_agent',
        }),
        appName: 'persona_ops_health',
      });
    this.#timeoutMs = timeoutMs;
  }

  async check(): Promise<void> {
    const events = this.#runner.runEphemeral({
      newMessage: {
        parts: [{ text: HEALTH_CHECK_PROMPT }],
        role: 'user',
      },
      runConfig: {
        maxLlmCalls: 1,
      },
      userId: `health-${randomUUID()}`,
    });

    let timeout: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => {
        reject(new Error('Vertex AI health check timed out.'));
      }, this.#timeoutMs);
    });

    try {
      await Promise.race([this.#consumeResponse(events), timeoutPromise]);
    } finally {
      if (timeout !== undefined) {
        clearTimeout(timeout);
      }
      void events.return(undefined);
    }
  }

  async #consumeResponse(
    events: AsyncGenerator<AgentEvent, void, undefined>,
  ): Promise<void> {
    for await (const event of events) {
      const hasText = event.content?.parts?.some(
        (part) => typeof part.text === 'string' && part.text.length > 0,
      );
      if (hasText === true) {
        return;
      }
    }

    throw new Error('Vertex AI returned no text response.');
  }
}
