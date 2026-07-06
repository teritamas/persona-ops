/* eslint-disable @typescript-eslint/require-await */
import { describe, expect, it, vi } from 'vitest';

import type { PersonaSimulationAgentPort } from '../../src/application/ports/agents/persona-simulation-agent-port.js';
import type { PersonaStorePort } from '../../src/application/ports/infra/database/persona-store-port.js';
import type { RequirementStorePort } from '../../src/application/ports/infra/database/requirement-store-port.js';
import type { SimulationQueuePort } from '../../src/application/ports/infra/queue/simulation-queue-port.js';
import type {
  SimulationClaimResult,
  SimulationStorePort,
} from '../../src/application/ports/infra/database/simulation-store-port.js';
import { SimulationService } from '../../src/application/simulation-service.js';
import type { Persona } from '../../src/domain/persona.js';
import type { Requirement } from '../../src/domain/requirement.js';
import type {
  PersonaReaction,
  Simulation,
} from '../../src/domain/simulation.js';

class MemoryRequirementStore implements RequirementStorePort {
  constructor(readonly requirement: Requirement | null) {}
  save = vi.fn(async () => Promise.resolve());
  findById = vi.fn(async () => Promise.resolve(this.requirement));
  findByProjectId = vi.fn(async () =>
    Promise.resolve(this.requirement ? [this.requirement] : []),
  );
  delete = vi.fn(async () => Promise.resolve());
}

class MemoryPersonaStore implements PersonaStorePort {
  constructor(readonly personas: Persona[]) {}
  save = vi.fn(async () => Promise.resolve());
  findByProjectId = vi.fn(async () => Promise.resolve(this.personas));
  deleteByProjectId = vi.fn(async () => Promise.resolve());
}

class MemorySimulationStore implements SimulationStorePort {
  simulation: Simulation | null = null;
  reactions = new Map<string, PersonaReaction>();
  active: Simulation | null = null;
  claimResult: SimulationClaimResult = 'claimed';

  save = vi.fn(async (simulation: Simulation) => {
    this.simulation = simulation;
  });
  findById = vi.fn(async () => this.simulation);
  findByProjectId = vi.fn(async () =>
    this.simulation ? [this.simulation] : [],
  );
  findActiveByRequirement = vi.fn(async () => this.active);
  claim = vi.fn(async () => this.claimResult);
  release = vi.fn(async () => Promise.resolve());
  updateResult = vi.fn(
    async (
      _projectId: string,
      _simulationId: string,
      update: Partial<Simulation>,
    ) => {
      if (this.simulation) {
        this.simulation = { ...this.simulation, ...update };
      }
    },
  );
  saveReaction = vi.fn(
    async (_projectId: string, reaction: PersonaReaction) => {
      this.reactions.set(reaction.personaId, reaction);
    },
  );
  findReactions = vi.fn(async () => [...this.reactions.values()]);
  delete = vi.fn(async () => {
    this.simulation = null;
  });
}

const requirement: Requirement = {
  id: 'requirement-1',
  projectId: 'project-1',
  title: '音声入力',
  description: '移動中に入力する',
  acceptanceCriteria: ['音声を文字にできる'],
  sourceDocumentIds: [],
  sourceSimulationIds: [],
  status: 'draft',
  version: 1,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

const personas: Persona[] = [
  {
    id: 'persona-1',
    projectId: 'project-1',
    name: '山田',
    age: 30,
    role: '営業',
    traits: ['外勤'],
    background: '移動が多い',
    sourceDocumentIds: [],
    avatarSeed: 'Felix',
    x: 20,
    y: 30,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  },
  {
    id: 'persona-2',
    projectId: 'project-1',
    name: '佐藤',
    age: 30,
    role: '管理者',
    traits: ['品質重視'],
    background: '入力内容を確認する',
    sourceDocumentIds: [],
    avatarSeed: 'Aneka',
    x: 70,
    y: 40,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  },
];

function createService(options?: {
  requirement?: Requirement | null;
  personas?: Persona[];
  agent?: PersonaSimulationAgentPort;
}) {
  const requirementStore = new MemoryRequirementStore(
    options?.requirement === undefined ? requirement : options.requirement,
  );
  const personaStore = new MemoryPersonaStore(options?.personas ?? personas);
  const simulationStore = new MemorySimulationStore();
  const agent: PersonaSimulationAgentPort =
    options?.agent ??
    ({
      simulate: vi.fn(async () => ({
        sentiment: 'positive' as const,
        shortFeedback: '便利です',
        detailedFeedback: '移動が多い中で簡単に登録できます。',
        workImage: '外回り中に素早くメモを取る。',
        concerns: [],
      })),
    } satisfies PersonaSimulationAgentPort);
  const queue = {
    enqueue: vi.fn(async () => Promise.resolve()),
  } satisfies SimulationQueuePort;
  return {
    service: new SimulationService(
      requirementStore,
      personaStore,
      simulationStore,
      agent,
      queue,
      'test-model',
    ),
    requirementStore,
    simulationStore,
    queue,
  };
}

describe('シミュレーションサービス', () => {
  it('承認時点の要件とペルソナをSnapshot化してTaskを登録する', async () => {
    const { service, requirementStore, simulationStore, queue } =
      createService();

    const simulation = await service.request('project-1', 'requirement-1');

    expect(simulation.status).toBe('queued');
    expect(simulation.requirementSnapshot.title).toBe('音声入力');
    expect(simulation.personaSnapshots).toHaveLength(2);
    expect(requirementStore.save).not.toHaveBeenCalled();
    expect(queue.enqueue).toHaveBeenCalledWith({
      projectId: 'project-1',
      simulationId: simulation.id,
    });
    expect(simulationStore.save).toHaveBeenCalledOnce();
  });

  it('ペルソナがない場合と同じ要件が実行中の場合はTaskを登録しない', async () => {
    const empty = createService({ personas: [] });
    await expect(
      empty.service.request('project-1', 'requirement-1'),
    ).rejects.toThrow('1件以上');

    const active = createService();
    active.simulationStore.active = {
      ...(await active.service.request('project-1', 'requirement-1')),
      status: 'running',
    };
    await expect(
      active.service.request('project-1', 'requirement-1'),
    ).rejects.toThrow('すでに');

    const approved = createService({
      requirement: { ...requirement, status: 'approved' },
    });
    await expect(
      approved.service.request('project-1', 'requirement-1'),
    ).rejects.toThrow('draft');
  });

  it('全ペルソナの成功結果を集計して完了する', async () => {
    const { service, simulationStore } = createService();
    const simulation = await service.request('project-1', 'requirement-1');

    await expect(service.run('project-1', simulation.id)).resolves.toBe('done');

    expect(simulationStore.simulation?.status).toBe('completed');
    expect(simulationStore.simulation?.successCount).toBe(2);
    expect(simulationStore.simulation?.summary.positiveCount).toBe(2);
  });

  it('一部のAgent失敗を保存して部分完了にする', async () => {
    const simulate = vi
      .fn()
      .mockResolvedValueOnce({
        sentiment: 'positive',
        shortFeedback: '便利',
        detailedFeedback: '使いやすい機能です。',
        workImage: '業務イメージ',
        concerns: [],
      })
      .mockRejectedValue(new Error('model error'));
    const { service, simulationStore } = createService({
      agent: { simulate },
    });
    const simulation = await service.request('project-1', 'requirement-1');

    await service.run('project-1', simulation.id);

    expect(simulationStore.simulation?.status).toBe('partially_completed');
    expect(simulationStore.simulation?.failureCount).toBe(1);
    expect([...simulationStore.reactions.values()]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          status: 'failed',
          errorCode: 'PERSONA_SIMULATION_FAILED',
        }),
      ]),
    );
  });

  it('全ペルソナのAgent処理が失敗した場合は失敗として完了する', async () => {
    const { service, simulationStore } = createService({
      agent: {
        simulate: vi.fn().mockRejectedValue(new Error('model error')),
      },
    });
    const simulation = await service.request('project-1', 'requirement-1');

    await service.run('project-1', simulation.id);

    expect(simulationStore.simulation?.status).toBe('failed');
    expect(simulationStore.simulation?.summary.averageValueScore).toBeNull();
  });

  it('Task登録に失敗した場合はSimulationを失敗状態へ更新する', async () => {
    const { service, simulationStore, queue } = createService();
    vi.mocked(queue.enqueue).mockRejectedValue(new Error('queue unavailable'));

    await expect(service.request('project-1', 'requirement-1')).rejects.toThrow(
      'queue unavailable',
    );
    expect(simulationStore.simulation?.status).toBe('failed');
    expect(simulationStore.simulation?.errorCode).toBe('QUEUE_ENQUEUE_FAILED');
  });

  it('実行中のTaskと完了済みTaskを冪等に扱う', async () => {
    const { service, simulationStore } = createService();
    const simulation = await service.request('project-1', 'requirement-1');
    simulationStore.claimResult = 'busy';
    await expect(service.run('project-1', simulation.id)).resolves.toBe('busy');
    simulationStore.claimResult = 'terminal';
    await expect(service.run('project-1', simulation.id)).resolves.toBe('done');
  });

  it('基盤エラー時はleaseを解放してCloud Tasksの再試行を可能にする', async () => {
    const { service, simulationStore } = createService();
    const simulation = await service.request('project-1', 'requirement-1');
    simulationStore.saveReaction.mockRejectedValue(
      new Error('firestore unavailable'),
    );

    await expect(service.run('project-1', simulation.id)).rejects.toThrow(
      'firestore unavailable',
    );
    expect(simulationStore.release).toHaveBeenCalledWith(
      'project-1',
      simulation.id,
      'TASK_EXECUTION_INTERRUPTED',
    );
  });

  it('シミュレーションを削除する', async () => {
    const { service, simulationStore } = createService();
    const simulation = await service.request('project-1', 'requirement-1');
    expect(simulationStore.simulation).not.toBeNull();

    await service.delete('project-1', simulation.id);

    expect(simulationStore.delete).toHaveBeenCalledWith(
      'project-1',
      simulation.id,
    );
    expect(simulationStore.simulation).toBeNull();
  });
});
