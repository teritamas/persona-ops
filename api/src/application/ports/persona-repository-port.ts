import type { Persona } from '../../domain/persona.js';

export interface PersonaRepositoryPort {
  /**
   * ペルソナを保存する
   * @param persona 保存するペルソナ
   */
  save(persona: Persona): Promise<void>;

  /**
   * プロジェクトIDに紐づくすべてのペルソナを取得する
   * @param projectId プロジェクトID
   * @returns ペルソナの配列
   */
  findByProjectId(projectId: string): Promise<Persona[]>;

  /**
   * プロジェクトIDに紐づくすべてのペルソナを削除する（再生成時の洗い替え用）
   * @param projectId プロジェクトID
   */
  deleteByProjectId(projectId: string): Promise<void>;
}
