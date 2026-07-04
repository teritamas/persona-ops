import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';

import { projectRoutes } from '../../src/routes/project-routes.js';
import { ProjectService } from '../../src/application/project-service.js';
import type { ProjectRepositoryPort } from '../../src/application/ports/infra/database/project-repository-port.js';
import type { Project } from '../../src/domain/project.js';

class MockProjectRepository implements ProjectRepositoryPort {
  private projects: Project[] = [];
  shouldFail = false;

  // eslint-disable-next-line @typescript-eslint/require-await
  async save(project: Project): Promise<void> {
    if (this.shouldFail) throw new Error('Mock Error');
    this.projects.push(project);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async findAll(): Promise<Project[]> {
    if (this.shouldFail) throw new Error('Mock Error');
    return this.projects;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async findById(id: string): Promise<Project | null> {
    if (this.shouldFail) throw new Error('Mock Error');
    return this.projects.find((p) => p.id === id) || null;
  }
  // eslint-disable-next-line @typescript-eslint/require-await
  async delete(id: string): Promise<void> {
    if (this.shouldFail) throw new Error('Mock Error');
    this.projects = this.projects.filter((p) => p.id !== id);
  }
}

describe('プロジェクトルーター', () => {
  const app = Fastify();
  const repository = new MockProjectRepository();
  const projectService = new ProjectService(repository);

  app.register(projectRoutes, { projectService });

  it('POST /api/v1/projects で新しいプロジェクトを作成する', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/projects',
      payload: { name: 'Test Project' },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json<Project>();
    expect(body.id).toBeTruthy();
    expect(body.name).toBe('Test Project');
    expect(body.createdAt).toBeTruthy();
    expect(body.updatedAt).toBeTruthy();
  });

  it('GET /api/v1/projects でプロジェクトのリストを返す', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/projects',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<Project[]>();
    expect(Array.isArray(body)).toBeTruthy();
    expect(body.length).toBe(1);
    expect(body[0]?.name).toBe('Test Project');
  });

  it('PUT /api/v1/projects/:id でプロジェクトを更新する', async () => {
    // 既存のプロジェクトを取得してIDを特定
    const getRes = await app.inject({
      method: 'GET',
      url: '/api/v1/projects',
    });
    const projects = getRes.json<Project[]>();
    const projectId = projects[0]?.id;
    expect(projectId).toBeDefined();

    const response = await app.inject({
      method: 'PUT',
      url: `/api/v1/projects/${projectId}`,
      payload: {
        name: 'Updated Project Name',
        activeChatId: 'chat_123',
        chats: [{ id: 'chat_123', title: 'Test Chat', messages: [] }],
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<Project>();
    expect(body.name).toBe('Updated Project Name');
    expect(body.name).toBe('Updated Project Name');
    expect(body.activeChatId).toBe('chat_123');
    expect(body.chats?.length).toBe(1);
  });

  it('PUT /api/v1/projects/:id で空のオブジェクトを送信した場合は何も更新せず200を返す', async () => {
    const getRes = await app.inject({
      method: 'GET',
      url: '/api/v1/projects',
    });
    const projects = getRes.json<Project[]>();
    const projectId = projects[0]?.id;

    const response = await app.inject({
      method: 'PUT',
      url: `/api/v1/projects/${projectId}`,
      payload: {},
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<Project>();
    expect(body.id).toBe(projectId);
  });

  it('PUT /api/v1/projects/:id で存在しないプロジェクトを更新しようとした場合は404を返す', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/projects/non-existent-id',
      payload: { name: 'New Name' },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: 'Project not found' });
  });

  it('GET /api/v1/projects でエラーが発生した場合は500を返す', async () => {
    repository.shouldFail = true;
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/projects',
    });
    repository.shouldFail = false;
    expect(response.statusCode).toBe(500);
  });

  it('POST /api/v1/projects でエラーが発生した場合は500を返す', async () => {
    repository.shouldFail = true;
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/projects',
      payload: { name: 'Test' },
    });
    repository.shouldFail = false;
    expect(response.statusCode).toBe(500);
  });

  it('PUT /api/v1/projects/:id でエラーが発生した場合は500を返す', async () => {
    repository.shouldFail = true;
    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/projects/some-id',
      payload: { name: 'New Name' },
    });
    repository.shouldFail = false;
    expect(response.statusCode).toBe(500);
  });
  it('DELETE /api/v1/projects/:id でプロジェクトを削除し204を返す', async () => {
    // 既存のプロジェクトを取得してIDを特定
    const getRes = await app.inject({
      method: 'GET',
      url: '/api/v1/projects',
    });
    const projects = getRes.json<Project[]>();
    const projectId = projects[0]?.id;
    expect(projectId).toBeDefined();

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/projects/${projectId}`,
    });

    expect(response.statusCode).toBe(204);
  });

  it('DELETE /api/v1/projects/:id でエラーが発生した場合は500を返す', async () => {
    repository.shouldFail = true;
    const response = await app.inject({
      method: 'DELETE',
      url: '/api/v1/projects/some-id',
    });
    repository.shouldFail = false;
    expect(response.statusCode).toBe(500);
  });
});
