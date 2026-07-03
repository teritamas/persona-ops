import { describe, expect, it } from 'vitest';

import {
  AdkVertexAiHealthService,
  type AgentRunner,
} from '../src/services/vertex-ai-health-service.js';

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

describe('AdkVertexAiHealthService', () => {
  it('空でないモデルのレスポンスを正常に受け付ける', async () => {
    const runner = createRunner(async function* () {
      yield await Promise.resolve({ content: { parts: [{ text: 'ok' }] } });
    });
    const service = new AdkVertexAiHealthService({
      model: 'test-model',
      runner,
    });

    await expect(service.check()).resolves.toBeUndefined();
  });

  it('空のモデルのレスポンスを拒否する', async () => {
    const runner = createRunner(async function* () {
      yield await Promise.resolve({ content: { parts: [] } });
    });
    const service = new AdkVertexAiHealthService({
      model: 'test-model',
      runner,
    });

    await expect(service.check()).rejects.toThrow(
      'Vertex AI returned no text response.',
    );
  });

  it('モデルのレスポンスが滞留した場合はタイムアウトする', async () => {
    const runner = createRunner(async function* () {
      yield await new Promise<never>(() => undefined);
    });
    const service = new AdkVertexAiHealthService({
      model: 'test-model',
      runner,
      timeoutMs: 5,
    });

    await expect(service.check()).rejects.toThrow('timed out');
  });
});
