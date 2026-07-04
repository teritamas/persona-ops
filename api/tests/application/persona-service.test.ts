import { describe, it, expect, vi } from 'vitest';
import { PersonaService } from '../../src/application/persona-service.js';
import type { PersonaRepositoryPort } from '../../src/application/ports/persona-repository-port.js';
import type { AiAgentPort } from '../../src/application/ports/ai-agent-port.js';
import type { Persona } from '../../src/domain/persona.js';

class MockPersonaRepository implements PersonaRepositoryPort {
  private personas: Persona[] = [];

  // eslint-disable-next-line @typescript-eslint/require-await
  async save(persona: Persona): Promise<void> {
    this.personas.push(persona);
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

describe('PersonaService (ペルソナサービス)', () => {
  it('プロジェクトIDに紐づくペルソナ一覧を取得できる', async () => {
    const repository = new MockPersonaRepository();
    const aiAgent = { invoke: vi.fn() } as unknown as AiAgentPort;
    const service = new PersonaService(repository, aiAgent);

    await repository.save({
      id: 'pers_1',
      projectId: 'proj_test',
      name: 'テスト 太郎',
      role: 'エンジニア',
      traits: [],
      background: '',
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
});
