import { randomUUID } from 'node:crypto';
import type { Persona } from '../domain/persona.js';
import type { PersonaRepositoryPort } from './ports/persona-repository-port.js';
import type { AiAgentPort } from './ports/ai-agent-port.js';
import { PERSONA_GENERATION_SYSTEM_PROMPT } from './prompts/persona-prompts.js';

export class PersonaService {
  constructor(
    private readonly personaRepository: PersonaRepositoryPort,
    private readonly aiAgent: AiAgentPort, // Kept in constructor in case we need it, though currently unused here
  ) {}

  /**
   * プロジェクトに紐づくペルソナ一覧を取得する
   * @param projectId プロジェクトID
   */
  async getPersonasByProjectId(projectId: string): Promise<Persona[]> {
    return this.personaRepository.findByProjectId(projectId);
  }
}
