import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';

import { projectRoutes } from '../../src/routes/project-routes.js';
import { ProjectService } from '../../src/application/project-service.js';
import { ProjectRepositoryPort } from '../../src/application/ports/project-repository-port.js';
import { Project } from '../../src/domain/project.js';

class MockProjectRepository implements ProjectRepositoryPort {
  private projects: Project[] = [];

  async save(project: Project): Promise<void> {
    this.projects.push(project);
  }

  async findAll(): Promise<Project[]> {
    return this.projects;
  }

  async findById(id: string): Promise<Project | null> {
    return this.projects.find((p) => p.id === id) || null;
  }
}

describe('Project Routes', () => {
  const app = Fastify();
  const repository = new MockProjectRepository();
  const projectService = new ProjectService(repository);

  app.register(projectRoutes, { projectService });

  it('POST /api/v1/projects creates a new project', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/projects',
      payload: { name: 'Test Project' },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.id).toBeTruthy();
    expect(body.name).toBe('Test Project');
    expect(body.createdAt).toBeTruthy();
    expect(body.updatedAt).toBeTruthy();
  });

  it('GET /api/v1/projects returns list of projects', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/projects',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(Array.isArray(body)).toBeTruthy();
    expect(body.length).toBe(1);
    expect(body[0].name).toBe('Test Project');
  });
});
