import type { Project } from '../../domain/project.js';

export interface ProjectRepositoryPort {
  /**
   * プロジェクトを保存する
   * @param project 保存するプロジェクト
   */
  save(project: Project): Promise<void>;

  /**
   * すべてのプロジェクトを取得する
   * @returns プロジェクトの配列
   */
  findAll(): Promise<Project[]>;

  /**
   * IDでプロジェクトを取得する
   * @param id プロジェクトID
   */
  findById(id: string): Promise<Project | null>;
}
