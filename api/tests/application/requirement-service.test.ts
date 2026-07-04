import { describe, expect, it } from 'vitest';

import { RequirementService } from '../../src/application/requirement-service.js';
import type { RequirementStorePort } from '../../src/application/ports/infra/database/requirement-store-port.js';
import type { SimulationStorePort } from '../../src/application/ports/infra/database/simulation-store-port.js';
import type { Requirement } from '../../src/domain/requirement.js';
import type { Simulation } from '../../src/domain/simulation.js';

class MemoryRequirementStore implements RequirementStorePort {
  readonly items = new Map<string, Requirement>();

  save(requirement: Requirement): Promise<void> {
    this.items.set(requirement.id, requirement);
    return Promise.resolve();
  }

  findById(
    projectId: string,
    requirementId: string,
  ): Promise<Requirement | null> {
    const item = this.items.get(requirementId);
    return Promise.resolve(item?.projectId === projectId ? item : null);
  }

  findByProjectId(projectId: string): Promise<Requirement[]> {
    return Promise.resolve(
      [...this.items.values()].filter((item) => item.projectId === projectId),
    );
  }

  delete(projectId: string, requirementId: string): Promise<void> {
    this.items.delete(requirementId);
    return Promise.resolve();
  }
}

describe('RequirementService', () => {
  const simulationStore = {
    findById: () => Promise.resolve(null),
  } as unknown as SimulationStorePort;

  it('新しい要件をdraftとして保存する', async () => {
    const store = new MemoryRequirementStore();
    const service = new RequirementService(store, simulationStore);

    const requirement = await service.saveDraft('project-1', {
      title: '音声入力',
      description: '移動中に入力できる',
      acceptanceCriteria: ['音声をテキスト化できる'],
    });

    expect(requirement.status).toBe('draft');
    expect(requirement.version).toBe(1);
    await expect(service.getById('project-1', requirement.id)).resolves.toEqual(
      requirement,
    );
  });

  it('承認済み要件を更新するとversionを増やしてdraftへ戻す', async () => {
    const store = new MemoryRequirementStore();
    const service = new RequirementService(store, simulationStore);
    const created = await service.saveDraft('project-1', {
      title: '音声入力',
      description: '初版',
      acceptanceCriteria: [],
    });
    await store.save({
      ...created,
      status: 'approved',
      approvedAt: new Date(),
    });

    const updated = await service.saveDraft('project-1', {
      id: created.id,
      title: '音声入力',
      description: '改訂版',
      acceptanceCriteria: ['誤変換を修正できる'],
    });

    expect(updated.status).toBe('draft');
    expect(updated.version).toBe(2);
    expect(updated.approvedAt).toBeUndefined();
  });

  it('存在しない要件の更新と取得を拒否する', async () => {
    const service = new RequirementService(
      new MemoryRequirementStore(),
      simulationStore,
    );

    await expect(
      service.saveDraft('project-1', {
        id: 'missing',
        title: '不存在',
        description: '不存在',
        acceptanceCriteria: [],
      }),
    ).rejects.toThrow('was not found');
    await expect(service.getById('project-1', 'missing')).rejects.toThrow(
      'was not found',
    );
  });

  it('同じプロジェクトの完了済みSimulationだけを参照元にできる', async () => {
    const store = new MemoryRequirementStore();
    const invalidSimulationStore = {
      findById: () => Promise.resolve(null),
    } as unknown as SimulationStorePort;
    const service = new RequirementService(store, invalidSimulationStore);

    await expect(
      service.saveDraft('project-1', {
        title: '改善要件',
        description: '過去結果を反映する',
        acceptanceCriteria: [],
        sourceSimulationIds: ['other-project-simulation'],
      }),
    ).rejects.toThrow('参照可能');

    const validSimulationStore = {
      findById: () =>
        Promise.resolve({
          status: 'completed',
        } as Simulation),
    } as unknown as SimulationStorePort;
    const validService = new RequirementService(store, validSimulationStore);
    await expect(
      validService.saveDraft('project-1', {
        title: '改善要件',
        description: '過去結果を反映する',
        acceptanceCriteria: [],
        sourceSimulationIds: ['completed-simulation'],
      }),
    ).resolves.toMatchObject({
      sourceSimulationIds: ['completed-simulation'],
    });
  });

  it('要件を削除し、紐づくシミュレーション結果も一緒に削除する', async () => {
    const store = new MemoryRequirementStore();
    const deletedSimIds: string[] = [];
    const mockSimulationStore = {
      findByProjectId: () =>
        Promise.resolve([
          { id: 'sim-1', requirementId: 'req-1' },
          { id: 'sim-2', requirementId: 'req-2' },
          { id: 'sim-3', requirementId: 'req-1' },
        ] as Simulation[]),
      delete: (_projectId: string, simulationId: string) => {
        deletedSimIds.push(simulationId);
        return Promise.resolve();
      },
    } as unknown as SimulationStorePort;

    const service = new RequirementService(store, mockSimulationStore);
    await store.save({
      id: 'req-1',
      projectId: 'project-1',
      title: '要件1',
      description: '',
      acceptanceCriteria: [],
      sourceSimulationIds: [],
      status: 'draft',
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await service.delete('project-1', 'req-1');

    expect(deletedSimIds).toContain('sim-1');
    expect(deletedSimIds).toContain('sim-3');
    expect(deletedSimIds).not.toContain('sim-2');
    await expect(store.findById('project-1', 'req-1')).resolves.toBeNull();
  });
});
