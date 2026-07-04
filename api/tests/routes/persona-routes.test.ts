import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import { personaRoutes } from '../../src/routes/persona-routes.js';
import { PersonaService } from '../../src/application/persona-service.js';
import type { PersonaRepositoryPort } from '../../src/application/ports/persona-repository-port.js';
import type { AiAgentPort } from '../../src/application/ports/ai-agent-port.js';
import type { Persona } from '../../src/domain/persona.js';

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

class MockAiAgent implements AiAgentPort {
  // eslint-disable-next-line @typescript-eslint/require-await
  async invoke(): Promise<string> {
    return `
\`\`\`json
{
  "personas": [
    {
      "name": "山田 太郎",
      "role": "デザイナー",
      "traits": ["几帳面"],
      "background": "使いやすさを重視"
    }
  ]
}
\`\`\`
    `;
  }
}

describe('ペルソナ ルーター', () => {
  const app = Fastify();
  const repository = new MockPersonaRepository();
  const aiAgent = new MockAiAgent();
  const personaService = new PersonaService(repository, aiAgent);

  void app.register(personaRoutes, { personaService });

  it('POST /api/v1/projects/:projectId/personas/generate でペルソナを自動生成する', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/projects/proj_123/personas/generate',
      payload: { promptText: '仕様書データ' },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json<Persona[]>();
    expect(body.length).toBe(1);
    expect(body[0]?.name).toBe('山田 太郎');
    expect(body[0]?.role).toBe('デザイナー');
  });

  it('GET /api/v1/projects/:projectId/personas でペルソナ一覧を返す', async () => {
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
      // eslint-disable-next-line @typescript-eslint/require-await
      generatePersonas: async () => {
        throw new Error('Test Gen Error');
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

  it('POST /api/v1/projects/:projectId/personas/generate でエラーが発生した時に 500 エラーを返す', async () => {
    const errorApp = Fastify();
    const errorService = {
      // eslint-disable-next-line @typescript-eslint/require-await
      getPersonasByProjectId: async () => {
        throw new Error('Test DB Error');
      },
      // eslint-disable-next-line @typescript-eslint/require-await
      generatePersonas: async () => {
        throw new Error('Test Gen Error');
      },
    } as unknown as PersonaService;

    void errorApp.register(personaRoutes, { personaService: errorService });

    const response = await errorApp.inject({
      method: 'POST',
      url: '/api/v1/projects/proj_123/personas/generate',
      payload: { promptText: '仕様書データ' },
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({ error: 'Test Gen Error' });
  });
});
