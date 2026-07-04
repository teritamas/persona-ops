import { randomUUID } from 'crypto';
import type { Project } from '../domain/project.js';
import type { ProjectRepositoryPort } from './ports/project-repository-port.js';

export class ProjectService {
  constructor(private readonly projectRepository: ProjectRepositoryPort) {}

  /**
   * 新しいプロジェクトを作成する
   * @param name プロジェクト名
   * @returns 作成されたプロジェクト
   */
  async createProject(name: string): Promise<Project> {
    const now = new Date();
    const project: Project = {
      id: randomUUID(),
      name,
      createdAt: now,
      updatedAt: now,
    };

    await this.projectRepository.save(project);
    return project;
  }

  /**
   * すべてのプロジェクトを取得する
   * @returns プロジェクトの配列
   */
  async getAllProjects(): Promise<Project[]> {
    return this.projectRepository.findAll();
  }

  /**
   * プロジェクトをIDで取得する
   * @param id プロジェクトID
   * @returns プロジェクト
   */
  async getProjectById(id: string): Promise<Project | null> {
    return this.projectRepository.findById(id);
  }
}
