import { describe, expect, it } from 'vitest';

import {
  AdkAiAgent,
  type AgentRunner,
} from '../../../src/infra/ai/adk-ai-agent.js';

function createRunner(
  factory: () => AsyncGenerator<
    { content?: { parts?: Array<{ text?: string }> } },
    void,
    undefined
  >,
): AgentRunner {
  return {
    runEphemeral: factory,
  };
}

describe('AdkAiAgent', () => {
  it('空でないモデルのレスポンスを正常に受け付ける', async () => {
    const runner = createRunner(async function* () {
      yield await Promise.resolve({ content: { parts: [{ text: 'ok' }] } });
    });
    const agent = new AdkAiAgent({
      model: 'test-model',
      runner,
    });

    await expect(agent.invoke('test prompt')).resolves.toBe('ok');
  });

  it('複数パーツに分かれたレスポンスを結合して返す', async () => {
    const runner = createRunner(async function* () {
      yield await Promise.resolve({
        content: { parts: [{ text: 'hello' }, { text: ' world' }] },
      });
    });
    const agent = new AdkAiAgent({
      model: 'test-model',
      runner,
    });

    await expect(agent.invoke('test prompt')).resolves.toBe('hello world');
  });

  it('空のモデルのレスポンスを拒否する', async () => {
    const runner = createRunner(async function* () {
      yield await Promise.resolve({ content: { parts: [] } });
    });
    const agent = new AdkAiAgent({
      model: 'test-model',
      runner,
    });

    await expect(agent.invoke('test prompt')).rejects.toThrow(
      'Vertex AI returned no text response.',
    );
  });

  it('モデルのレスポンスが滞留した場合はタイムアウトする', async () => {
    const runner = createRunner(async function* () {
      yield await new Promise<never>(() => undefined);
    });
    const agent = new AdkAiAgent({
      model: 'test-model',
      runner,
    });

    await expect(agent.invoke('test prompt', { timeoutMs: 5 })).rejects.toThrow(
      'timed out',
    );
  });
});
