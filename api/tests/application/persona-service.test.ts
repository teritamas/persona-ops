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

class MockAiAgent implements AiAgentPort {
  invoke = vi.fn().mockResolvedValue(`
\`\`\`json
{
  "personas": [
    {
      "name": "鈴木 一郎",
      "role": "営業マネージャー",
      "traits": ["効率的", "多忙"],
      "background": "営業の効率化を求めている"
    },
    {
      "name": "佐藤 花子",
      "role": "営業担当",
      "traits": ["スマートフォン活用", "移動が多い"],
      "background": "出先からの入力を簡略化したい"
    }
  ]
}
\`\`\`
`);
}

describe('PersonaService (ペルソナサービス)', () => {
  it('提供された情報からペルソナデータを自動生成して保存する', async () => {
    const repository = new MockPersonaRepository();
    const aiAgent = new MockAiAgent();
    const service = new PersonaService(repository, aiAgent);

    const projectId = 'proj_test_id';
    const personas = await service.generatePersonas(
      projectId,
      'テストのインプットテキスト',
    );

    expect(personas.length).toBe(2);
    expect(personas[0]?.name).toBe('鈴木 一郎');
    expect(personas[0]?.role).toBe('営業マネージャー');
    expect(personas[0]?.avatarSeed).toBeTruthy();
    expect(personas[0]?.x).toBeGreaterThanOrEqual(10);
    expect(personas[0]?.x).toBeLessThanOrEqual(90);

    const savedPersonas = await repository.findByProjectId(projectId);
    expect(savedPersonas.length).toBe(2);
  });

  it('再生成時に既存のペルソナが削除されリビルドされること', async () => {
    const repository = new MockPersonaRepository();
    const aiAgent = new MockAiAgent();
    const service = new PersonaService(repository, aiAgent);
    const projectId = 'proj_test_id';

    // 最初にダミーで1件保存しておく
    await repository.save({
      id: 'pers_dummy',
      projectId,
      name: 'ダミー',
      role: 'ダミー職種',
      traits: [],
      background: '',
      avatarSeed: 'Felix',
      x: 50,
      y: 50,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const personas = await service.generatePersonas(
      projectId,
      '再生成用テキスト',
    );
    expect(personas.length).toBe(2);

    const savedPersonas = await repository.findByProjectId(projectId);
    expect(savedPersonas.length).toBe(2);
    expect(savedPersonas.some((p) => p.id === 'pers_dummy')).toBe(false);
  });

  it('平文のJSONテキストを正しくパースして保存する', async () => {
    const repository = new MockPersonaRepository();
    const aiAgent = new MockAiAgent();
    aiAgent.invoke = vi.fn().mockResolvedValue(`
{
  "personas": [
    {
      "name": "プレーン",
      "role": "プレーン職種",
      "traits": [],
      "background": ""
    }
  ]
}
    `);
    const service = new PersonaService(repository, aiAgent);
    const personas = await service.generatePersonas(
      'proj_123',
      'プレーンテスト',
    );
    expect(personas.length).toBe(1);
    expect(personas[0]?.name).toBe('プレーン');
  });

  it('無効なJSONが返された場合にエラーをスローすること', async () => {
    const repository = new MockPersonaRepository();
    const aiAgent = new MockAiAgent();
    aiAgent.invoke = vi.fn().mockResolvedValue('invalid json string');
    const service = new PersonaService(repository, aiAgent);

    await expect(
      service.generatePersonas('proj_123', 'エラーテスト'),
    ).rejects.toThrow('Failed to parse persona generation response');
  });
});
