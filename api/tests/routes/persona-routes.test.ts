import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import { personaRoutes } from '../../src/routes/persona-routes.js';
import { PersonaService } from '../../src/application/persona-service.js';
import type { PersonaStorePort } from '../../src/application/ports/infra/database/persona-store-port.js';
import type { Persona } from '../../src/domain/persona.js';
import { MemorySourceDocumentRepository } from '../helpers/memory-source-document-repository.js';

class MockPersonaRepository implements PersonaStorePort {
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

describe('ペルソナ ルーター', () => {
  const app = Fastify();
  const repository = new MockPersonaRepository();
  const personaService = new PersonaService(
    repository,
    new MemorySourceDocumentRepository(),
  );

  void app.register(personaRoutes, { personaService });

  it('GET /api/v1/projects/:projectId/personas でペルソナ一覧を返す', async () => {
    // Seed the mock repository
    await repository.save({
      id: 'test_id',
      projectId: 'proj_123',
      name: '山田 太郎',
      role: 'デザイナー',
      traits: [],
      background: '',
      sourceDocumentIds: [],
      avatarSeed: 'Felix',
      x: 0,
      y: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/projects/proj_123/personas',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<Persona[]>();
    expect(body.length).toBe(1);
    expect(body[0]?.name).toBe('山田 太郎');
  });

  it('GET /api/v1/projects/:projectId/personas でエラーが発生した時に 500 エラーを返す', async () => {
    const errorApp = Fastify();
    const errorService = {
      // eslint-disable-next-line @typescript-eslint/require-await
      getPersonasByProjectId: async () => {
        throw new Error('Test DB Error');
      },
    } as unknown as PersonaService;

    void errorApp.register(personaRoutes, { personaService: errorService });

    const response = await errorApp.inject({
      method: 'GET',
      url: '/api/v1/projects/proj_123/personas',
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({ error: 'Internal Server Error' });
  });

  it('POST /api/v1/projects/:projectId/personas/:personaId/position で位置座標を更新する', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/projects/proj_123/personas/test_id/position',
      payload: { x: 55, y: 66 },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<Persona>();
    expect(body.x).toBe(55);
    expect(body.y).toBe(66);
  });

  it('POST /api/v1/projects/:projectId/personas/:personaId/position で見つからない場合404を返す', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/projects/proj_123/personas/nonexistent/position',
      payload: { x: 55, y: 66 },
    });

    expect(response.statusCode).toBe(404);
  });
});
