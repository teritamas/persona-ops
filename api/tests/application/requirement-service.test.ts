import { describe, expect, it } from 'vitest';

import { RequirementService } from '../../src/application/requirement-service.js';
import type { RequirementStorePort } from '../../src/application/ports/infra/database/requirement-store-port.js';
import type { SimulationStorePort } from '../../src/application/ports/infra/database/simulation-store-port.js';
import type { Requirement } from '../../src/domain/requirement.js';
import type { Simulation } from '../../src/domain/simulation.js';
import { MemorySourceDocumentRepository } from '../helpers/memory-source-document-repository.js';

class MemoryRequirementStore implements RequirementStorePort {
  readonly items = new Map<string, Requirement>();
  readonly history = new Map<string, Requirement[]>();

  save(requirement: Requirement): Promise<void> {
    this.items.set(requirement.id, requirement);
    const list = this.history.get(requirement.id) ?? [];
    list.push({ ...requirement });
    this.history.set(requirement.id, list);
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
    this.history.delete(requirementId);
    return Promise.resolve();
  }

  findVersion(
    projectId: string,
    requirementId: string,
    version: number,
  ): Promise<Requirement | null> {
    const list = this.history.get(requirementId) ?? [];
    const item = list.find((r) => r.version === version);
    return Promise.resolve(item?.projectId === projectId ? item : null);
  }

  findVersions(
    projectId: string,
    requirementId: string,
  ): Promise<Requirement[]> {
    const list = this.history.get(requirementId) ?? [];
    return Promise.resolve(
      list.filter((r) => r.projectId === projectId).reverse(),
    );
  }
}

describe('要件サービス', () => {
  const simulationStore = {
    findById: () => Promise.resolve(null),
  } as unknown as SimulationStorePort;

  it('新しい要件をdraftとして保存する', async () => {
    const store = new MemoryRequirementStore();
    const service = new RequirementService(
      store,
      simulationStore,
      new MemorySourceDocumentRepository(),
    );

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
    const service = new RequirementService(
      store,
      simulationStore,
      new MemorySourceDocumentRepository(),
    );
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
      new MemorySourceDocumentRepository(),
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
    const service = new RequirementService(
      store,
      invalidSimulationStore,
      new MemorySourceDocumentRepository(),
    );

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
    const validService = new RequirementService(
      store,
      validSimulationStore,
      new MemorySourceDocumentRepository(),
    );
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

    const service = new RequirementService(
      store,
      mockSimulationStore,
      new MemorySourceDocumentRepository(),
    );
    await store.save({
      id: 'req-1',
      projectId: 'project-1',
      title: '要件1',
      description: '',
      acceptanceCriteria: [],
      sourceDocumentIds: [],
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

  it('取得済み資料を要件の根拠として保存する', async () => {
    const store = new MemoryRequirementStore();
    const sourceDocuments = new MemorySourceDocumentRepository();
    await sourceDocuments.save({
      id: 'document-1',
      projectId: 'project-1',
      type: 'url',
      reference: 'https://example.com',
      fetchStatus: 'success',
      contentSnapshot: '要件の根拠',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const service = new RequirementService(
      store,
      simulationStore,
      sourceDocuments,
    );

    const saved = await service.saveDraft('project-1', {
      title: '証拠付き要件',
      description: '資料を参照する',
      acceptanceCriteria: [],
      sourceDocumentIds: ['document-1'],
    });

    expect(saved.sourceDocumentIds).toEqual(['document-1']);
  });

  it('ドラフト要件を承認する', async () => {
    const store = new MemoryRequirementStore();
    const service = new RequirementService(
      store,
      simulationStore,
      new MemorySourceDocumentRepository(),
    );
    const created = await service.saveDraft('project-1', {
      title: '音声入力',
      description: '要約テスト',
      acceptanceCriteria: [],
    });

    expect(created.status).toBe('draft');
    expect(created.approvedAt).toBeUndefined();

    const approved = await service.approveDraft('project-1', created.id);
    expect(approved.status).toBe('approved');
    expect(approved.approvedAt).toBeDefined();

    // 既に承認済みの場合はそのまま返す
    const reApproved = await service.approveDraft('project-1', created.id);
    expect(reApproved.approvedAt).toEqual(approved.approvedAt);
  });

  it('要件のバージョン履歴を取得および復元する', async () => {
    const store = new MemoryRequirementStore();
    const service = new RequirementService(
      store,
      simulationStore,
      new MemorySourceDocumentRepository(),
    );
    const v1 = await service.saveDraft('project-1', {
      title: '要件v1',
      description: '初期説明',
      acceptanceCriteria: [],
    });
    await service.saveDraft('project-1', {
      id: v1.id,
      title: '要件v2',
      description: '更新された説明',
      acceptanceCriteria: [],
    });

    const versions = await service.getVersions('project-1', v1.id);
    expect(versions).toHaveLength(2);
    expect(versions[0].version).toBe(2);
    expect(versions[1].version).toBe(1);

    const restored = await service.restoreVersion('project-1', v1.id, 1);
    expect(restored.version).toBe(3);
    expect(restored.title).toBe('要件v1');
    expect(restored.description).toBe('初期説明');
    expect(restored.status).toBe('draft');
  });
});
