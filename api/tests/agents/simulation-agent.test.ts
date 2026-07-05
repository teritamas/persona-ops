import { describe, expect, it } from 'vitest';

import {
  AdkPersonaSimulationAgent,
  type SimulationAgentRunner,
} from '../../src/agents/simulation-agent/agent.js';

function createRunner(response: string): SimulationAgentRunner {
  return {
    runEphemeral: async function* () {
      yield await Promise.resolve({
        content: { parts: [{ text: response }] },
      });
    },
  };
}

const input = {
  persona: {
    id: 'persona-1',
    name: '山田',
    age: 30,
    role: '営業',
    traits: ['外勤'],
    background: '移動が多い',
    sourceDocumentIds: [],
    updatedAt: '2026-01-01T00:00:00Z',
  },
  requirement: {
    id: 'requirement-1',
    title: '音声入力',
    description: '移動中に入力する',
    acceptanceCriteria: [],
    sourceDocumentIds: [],
    sourceSimulationIds: [],
    version: 1,
  },
};

describe('ADKペルソナシミュレーションAgent', () => {
  it('構造化されたペルソナ反応を返す', async () => {
    const response = JSON.stringify({
      sentiment: 'positive',
      shortFeedback: '便利です',
      detailedFeedback: '移動が多い中で簡単に登録できます。',
      workImage: '外回り中に素早くメモを取る。',
      concerns: [],
    });
    const agent = new AdkPersonaSimulationAgent('test-model', () =>
      createRunner(response),
    );

    await expect(agent.simulate(input)).resolves.toMatchObject({
      sentiment: 'positive',
      shortFeedback: '便利です',
    });
  });

  it('必須フィールドの欠落や不正データを拒否する', async () => {
    const missingField = new AdkPersonaSimulationAgent('test-model', () =>
      createRunner(
        JSON.stringify({
          sentiment: 'positive',
          detailedFeedback: 'テスト',
          workImage: 'イメージ',
          concerns: [],
        }),
      ),
    );
    const invalidJson = new AdkPersonaSimulationAgent('test-model', () =>
      createRunner('not-json'),
    );

    await expect(missingField.simulate(input)).rejects.toThrow();
    await expect(invalidJson.simulate(input)).rejects.toThrow('invalid JSON');
  });

  it('空の応答を拒否する', async () => {
    const agent = new AdkPersonaSimulationAgent('test-model', () =>
      createRunner(''),
    );

    await expect(agent.simulate(input)).rejects.toThrow('empty response');
  });

  it('Agent応答が滞留した場合はタイムアウトする', async () => {
    const agent = new AdkPersonaSimulationAgent(
      'test-model',
      () => ({
        runEphemeral: async function* () {
          yield await new Promise<never>(() => undefined);
        },
      }),
      5,
    );

    await expect(agent.simulate(input)).rejects.toThrow('timed out');
  });
});
