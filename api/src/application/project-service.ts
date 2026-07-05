import { randomUUID } from 'node:crypto';
import { NotFoundError } from '../domain/errors.js';
import type { Chat, Message, Project } from '../domain/project.js';
import type { ProjectRepositoryPort } from './ports/infra/database/project-repository-port.js';
import type { ProjectDataDeletionPort } from './ports/infra/database/project-data-deletion-port.js';
import type { CreateChatRequest } from './project/dto/chat-requests.js';

export class ProjectService {
  constructor(
    private readonly projectRepository: ProjectRepositoryPort,
    private readonly projectDataDeletion?: ProjectDataDeletionPort,
  ) {}

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

  async updateProjectName(id: string, name: string): Promise<Project> {
    const project = await this.requireProject(id);
    const updated = {
      ...project,
      name,
      updatedAt: new Date(),
    };
    await this.projectRepository.updateName(id, name, updated.updatedAt);
    return updated;
  }

  async createChat(
    projectId: string,
    request: CreateChatRequest,
  ): Promise<Project> {
    const chat: Chat = {
      id: `chat_${randomUUID()}`,
      title: request.title,
      type: request.type,
      ...(request.personaId ? { personaId: request.personaId } : {}),
      messages: request.initialMessages ?? [],
    };
    return this.projectRepository.createChat(projectId, chat);
  }

  async setActiveChat(projectId: string, chatId: string): Promise<Project> {
    return this.projectRepository.setActiveChat(projectId, chatId);
  }

  async appendChatMessages(
    projectId: string,
    chatId: string,
    messages: Message[],
  ): Promise<Project> {
    return this.projectRepository.appendChatMessages(
      projectId,
      chatId,
      messages,
    );
  }

  /**
   * プロジェクトを削除する
   * @param id プロジェクトID
   */
  async deleteProject(id: string): Promise<void> {
    await this.requireProject(id);
    if (this.projectDataDeletion) {
      await this.projectDataDeletion.deleteProjectData(id);
      return;
    }
    await this.projectRepository.delete(id);
  }

  private async requireProject(id: string): Promise<Project> {
    const project = await this.projectRepository.findById(id);
    if (!project) {
      throw new NotFoundError('Project', id);
    }
    return project;
  }
}
