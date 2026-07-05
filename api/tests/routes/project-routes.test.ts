import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import type { ProjectDataDeletionPort } from '../../src/application/ports/infra/database/project-data-deletion-port.js';
import type { ProjectRepositoryPort } from '../../src/application/ports/infra/database/project-repository-port.js';
import { ProjectService } from '../../src/application/project-service.js';
import { NotFoundError } from '../../src/domain/errors.js';
import type { Chat, Message, Project } from '../../src/domain/project.js';
import { projectRoutes } from '../../src/routes/project-routes.js';

class MemoryProjectRepository implements ProjectRepositoryPort {
  readonly projects = new Map<string, Project>();
  shouldFail = false;

  save(project: Project): Promise<void> {
    this.failIfNeeded();
    this.projects.set(project.id, project);
    return Promise.resolve();
  }

  findAll(): Promise<Project[]> {
    this.failIfNeeded();
    return Promise.resolve([...this.projects.values()]);
  }

  findById(id: string): Promise<Project | null> {
    this.failIfNeeded();
    return Promise.resolve(this.projects.get(id) ?? null);
  }

  updateName(projectId: string, name: string, updatedAt: Date): Promise<void> {
    return this.update(projectId, (project) => ({
      ...project,
      name,
      updatedAt,
    })).then(() => undefined);
  }

  delete(id: string): Promise<void> {
    this.failIfNeeded();
    this.projects.delete(id);
    return Promise.resolve();
  }

  createChat(projectId: string, chat: Chat): Promise<Project> {
    return this.update(projectId, (project) => ({
      ...project,
      chats: [...(project.chats ?? []), chat],
      activeChatId: chat.id,
    }));
  }

  setActiveChat(projectId: string, chatId: string): Promise<Project> {
    return this.update(projectId, (project) => {
      if (!(project.chats ?? []).some((chat) => chat.id === chatId)) {
        throw new NotFoundError('Chat', chatId);
      }
      return { ...project, activeChatId: chatId };
    });
  }

  appendChatMessages(
    projectId: string,
    chatId: string,
    messages: Message[],
  ): Promise<Project> {
    return this.update(projectId, (project) => ({
      ...project,
      chats: (project.chats ?? []).map((chat) =>
        chat.id === chatId
          ? { ...chat, messages: [...chat.messages, ...messages] }
          : chat,
      ),
    }));
  }

  private update(
    projectId: string,
    update: (project: Project) => Project,
  ): Promise<Project> {
    this.failIfNeeded();
    const project = this.projects.get(projectId);
    if (!project) {
      throw new NotFoundError('Project', projectId);
    }
    const updated = update(project);
    this.projects.set(projectId, updated);
    return Promise.resolve(updated);
  }

  private failIfNeeded(): void {
    if (this.shouldFail) {
      throw new Error('Mock Error');
    }
  }
}

function createApp(options?: {
  repository?: MemoryProjectRepository;
  deletion?: ProjectDataDeletionPort;
}) {
  const repository = options?.repository ?? new MemoryProjectRepository();
  const projectService = new ProjectService(repository, options?.deletion);
  const app = Fastify();
  void app.register(projectRoutes, { projectService });
  return { app, projectService, repository };
}

describe('プロジェクトルーター', () => {
  it('作成・一覧・詳細取得では一覧にチャット本文を含めない', async () => {
    const { app } = createApp();
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/projects',
      payload: { name: 'Test Project' },
    });
    const project = created.json<Project>();

    const list = await app.inject({
      method: 'GET',
      url: '/api/v1/projects',
    });
    const detail = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${project.id}`,
    });

    expect(created.statusCode).toBe(201);
    const summaries = list.json<Array<Record<string, unknown>>>();
    expect(summaries).toHaveLength(1);
    expect(summaries[0]).not.toHaveProperty('chats');
    expect(detail.json<Project>()).toMatchObject({
      id: project.id,
      chats: [],
      activeChatId: null,
    });
  });

  it('プロジェクト名だけを更新し、未知の入力を拒否する', async () => {
    const { app, projectService } = createApp();
    const project = await projectService.createProject('変更前');

    const updated = await app.inject({
      method: 'PUT',
      url: `/api/v1/projects/${project.id}`,
      payload: { name: '変更後' },
    });
    const invalid = await app.inject({
      method: 'PUT',
      url: `/api/v1/projects/${project.id}`,
      payload: { chats: [] },
    });

    expect(updated.json<Project>().name).toBe('変更後');
    expect(invalid.statusCode).toBe(400);
  });

  it('チャット作成・メッセージ追記・切替を専用UseCaseで処理する', async () => {
    const { app, projectService } = createApp();
    const project = await projectService.createProject('チャット');
    const created = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${project.id}/chats`,
      payload: { title: '新規チャット', type: 'agent' },
    });
    const createdProject = created.json<Project>();
    const chatId = createdProject.activeChatId!;

    const appended = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${project.id}/chats/${chatId}/messages`,
      payload: {
        messages: [
          { id: 'message-1', role: 'user', text: 'こんにちは', time: '10:00' },
        ],
      },
    });
    const switched = await app.inject({
      method: 'PUT',
      url: `/api/v1/projects/${project.id}/active-chat`,
      payload: { chatId },
    });

    expect(created.statusCode).toBe(201);
    expect(appended.json<Project>().chats?.[0]?.messages[0]?.text).toBe(
      'こんにちは',
    );
    expect(switched.json<Project>().activeChatId).toBe(chatId);
  });

  it('存在しないリソースを404へ変換する', async () => {
    const { app } = createApp();
    const detail = await app.inject({
      method: 'GET',
      url: '/api/v1/projects/missing',
    });
    const deletion = await app.inject({
      method: 'DELETE',
      url: '/api/v1/projects/missing',
    });

    expect(detail.statusCode).toBe(404);
    expect(deletion.statusCode).toBe(404);
  });

  it('削除時に関連データ削除Portを呼び出す', async () => {
    const deleteProjectData = vi.fn(() => Promise.resolve());
    const { app, projectService } = createApp({
      deletion: { deleteProjectData },
    });
    const project = await projectService.createProject('削除対象');

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/projects/${project.id}`,
    });

    expect(response.statusCode).toBe(204);
    expect(deleteProjectData).toHaveBeenCalledWith(project.id);
  });

  it('予期しないRepositoryエラーを安全な500へ変換する', async () => {
    const repository = new MemoryProjectRepository();
    repository.shouldFail = true;
    const { app } = createApp({ repository });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/projects',
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({ error: 'Internal Server Error' });
  });
});
