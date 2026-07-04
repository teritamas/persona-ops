import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import { personaRoutes } from '../../src/routes/persona-routes.js';
import { PersonaService } from '../../src/application/persona-service.js';
import type { PersonaRepositoryPort } from '../../src/application/ports/persona-repository-port.js';
import type { Persona } from '../../src/domain/persona.js';

import type { AiAgentPort } from '../../src/application/ports/ai-agent-port.js';

class MockPersonaRepository implements PersonaRepositoryPort {
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
  const aiAgent = {} as unknown as AiAgentPort; // Mock unused AiAgent
  const personaService = new PersonaService(repository, aiAgent);

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
});
