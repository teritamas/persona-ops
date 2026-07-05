import { describe, it, expect } from 'vitest';
import { PersonaService } from '../../src/application/persona-service.js';
import type { PersonaStorePort } from '../../src/application/ports/infra/database/persona-store-port.js';
import type { Persona } from '../../src/domain/persona.js';
import { MemorySourceDocumentRepository } from '../helpers/memory-source-document-repository.js';

class MockPersonaRepository implements PersonaStorePort {
  private personas: Persona[] = [];

  // eslint-disable-next-line @typescript-eslint/require-await
  async save(persona: Persona): Promise<void> {
    const index = this.personas.findIndex((item) => item.id === persona.id);
    if (index >= 0) {
      this.personas[index] = persona;
    } else {
      this.personas.push(persona);
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async findByProjectId(projectId: string): Promise<Persona[]> {
    return this.personas.filter((p) => p.projectId === projectId);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async deleteByProjectId(projectId: string): Promise<void> {
    this.personas = this.personas.filter((p) => p.projectId !== projectId);
  }
}

describe('ペルソナサービス', () => {
  it('プロジェクトIDに紐づくペルソナ一覧を取得できる', async () => {
    const repository = new MockPersonaRepository();
    const service = new PersonaService(
      repository,
      new MemorySourceDocumentRepository(),
    );

    await repository.save({
      id: 'pers_1',
      projectId: 'proj_test',
      name: 'テスト 太郎',
      age: 30,
      role: 'エンジニア',
      traits: [],
      background: '',
      sourceDocumentIds: [],
      avatarSeed: 'Felix',
      x: 0,
      y: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const personas = await service.getPersonasByProjectId('proj_test');
    expect(personas.length).toBe(1);
    expect(personas[0]?.name).toBe('テスト 太郎');
  });

  it('IDを指定した更新では同じ役割の別ペルソナを変更しない', async () => {
    const repository = new MockPersonaRepository();
    const service = new PersonaService(
      repository,
      new MemorySourceDocumentRepository(),
    );
    await service.savePersonas('proj_test', [
      {
        name: '山田',
        age: 30,
        role: '営業',
        traits: ['外勤'],
        background: '新規営業',
      },
      {
        name: '佐藤',
        age: 30,
        role: '営業',
        traits: ['内勤'],
        background: '既存顧客担当',
      },
    ]);
    const before = await service.getPersonasByProjectId('proj_test');

    await service.savePersonas('proj_test', [
      {
        id: before[0]!.id,
        name: '山田',
        age: 30,
        role: '営業',
        traits: ['モバイル重視'],
        background: '新規営業',
      },
    ]);

    const after = await service.getPersonasByProjectId('proj_test');
    expect(after).toHaveLength(2);
    expect(after.find((persona) => persona.name === '山田')?.traits).toEqual([
      'モバイル重視',
    ]);
    expect(after.find((persona) => persona.name === '佐藤')?.traits).toEqual([
      '内勤',
    ]);
  });

  it('同じプロジェクトの取得済み資料をペルソナの根拠に設定する', async () => {
    const repository = new MockPersonaRepository();
    const sourceDocuments = new MemorySourceDocumentRepository();
    await sourceDocuments.save({
      id: 'document-1',
      projectId: 'proj_test',
      type: 'url',
      reference: 'https://example.com',
      fetchStatus: 'success',
      contentSnapshot: '顧客調査',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const service = new PersonaService(repository, sourceDocuments);

    await service.savePersonas('proj_test', [
      {
        name: '山田',
        age: 30,
        role: '営業',
        traits: [],
        background: '外勤',
        sourceDocumentIds: ['document-1'],
      },
    ]);

    await expect(
      service.getPersonasByProjectId('proj_test'),
    ).resolves.toMatchObject([{ sourceDocumentIds: ['document-1'] }]);
    await expect(
      service.savePersonas('proj_test', [
        {
          name: '不正',
          age: 30,
          role: '営業',
          traits: [],
          background: '',
          sourceDocumentIds: ['missing'],
        },
      ]),
    ).rejects.toThrow('参照可能な資料ではありません');
  });
});
