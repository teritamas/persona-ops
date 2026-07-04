import { randomUUID } from 'node:crypto';
import type { Persona } from '../domain/persona.js';
import type { PersonaRepositoryPort } from './ports/persona-repository-port.js';
import type { AiAgentPort } from './ports/ai-agent-port.js';
import { PERSONA_GENERATION_SYSTEM_PROMPT } from './prompts/persona-prompts.js';

export class PersonaService {
  constructor(
    private readonly personaRepository: PersonaRepositoryPort,
    private readonly aiAgent: AiAgentPort,
  ) {}

  /**
   * プロジェクトに紐づくペルソナ一覧を取得する
   * @param projectId プロジェクトID
   */
  async getPersonasByProjectId(projectId: string): Promise<Persona[]> {
    return this.personaRepository.findByProjectId(projectId);
  }

  /**
   * 提供されたテキスト情報からペルソナ群を自動生成し、保存する
   * @param projectId プロジェクトID
   * @param promptText ペルソナのベースとなるテキスト情報（インタビューログや要件定義書など）
   */
  async generatePersonas(
    projectId: string,
    promptText: string,
  ): Promise<Persona[]> {
    const responseText = await this.aiAgent.invoke(
      `${PERSONA_GENERATION_SYSTEM_PROMPT}\n\n提供された情報:\n${promptText}`,
    );

    const jsonString = this.extractJson(responseText);
    let data: {
      personas: Array<{
        name: string;
        role: string;
        traits: string[];
        background: string;
      }>;
    };

    try {
      data = JSON.parse(jsonString) as typeof data;
      if (!data || !Array.isArray(data.personas)) {
        throw new Error('Invalid response structure from AI.');
      }
    } catch (err: unknown) {
      throw new Error(
        `Failed to parse persona generation response: ${(err as Error).message}. Raw response: ${responseText}`,
        { cause: err },
      );
    }

    // 既存のペルソナがあれば削除（リビルド）
    await this.personaRepository.deleteByProjectId(projectId);

    // アバター種別と座標定義のリスト
    const avatars = ['Felix', 'Aneka', 'Jasper', 'Avery', 'Leo'];
    const coordinates = [
      { x: 20, y: 30 },
      { x: 70, y: 40 },
      { x: 45, y: 60 },
      { x: 80, y: 70 },
      { x: 30, y: 80 },
      { x: 55, y: 25 },
      { x: 15, y: 60 },
    ];

    const personas: Persona[] = [];
    const now = new Date();

    for (let i = 0; i < data.personas.length; i++) {
      const pData = data.personas[i]!;
      const coord = coordinates[i % coordinates.length]!;
      const avatarSeed = avatars[i % avatars.length]!;

      // 座標が重なりすぎないようにわずかに乱数を加える
      const jitterX = Math.floor(Math.random() * 6) - 3; // -3 ~ +3
      const jitterY = Math.floor(Math.random() * 6) - 3;

      const persona: Persona = {
        id: `pers_${randomUUID()}`,
        projectId,
        name: pData.name,
        role: pData.role,
        traits: pData.traits,
        background: pData.background,
        avatarSeed,
        x: Math.max(10, Math.min(90, coord.x + jitterX)),
        y: Math.max(10, Math.min(90, coord.y + jitterY)),
        createdAt: now,
        updatedAt: now,
      };

      await this.personaRepository.save(persona);
      personas.push(persona);
    }

    return personas;
  }

  private extractJson(text: string): string {
    const jsonMatch = /```json\s*([\s\S]*?)\s*```/.exec(text);
    if (jsonMatch && jsonMatch[1]) {
      return jsonMatch[1].trim();
    }
    const rawMatch = /\{[\s\S]*\}/.exec(text);
    if (rawMatch) {
      return rawMatch[0].trim();
    }
    return text.trim();
  }
}
