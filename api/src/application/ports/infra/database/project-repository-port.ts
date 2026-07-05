import type { Chat, Message, Project } from '../../../../domain/project.js';

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
  updateName(projectId: string, name: string, updatedAt: Date): Promise<void>;

  /**
   * プロジェクトを削除する
   * @param id プロジェクトID
   */
  delete(id: string): Promise<void>;

  createChat(projectId: string, chat: Chat): Promise<Project>;
  setActiveChat(projectId: string, chatId: string): Promise<Project>;
  appendChatMessages(
    projectId: string,
    chatId: string,
    messages: Message[],
  ): Promise<Project>;
}
