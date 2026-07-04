import type { Persona } from '../../../../domain/persona.js';

export interface PersonaStorePort {
  save(persona: Persona): Promise<void>;
  findByProjectId(projectId: string): Promise<Persona[]>;
  deleteByProjectId(projectId: string): Promise<void>;
}
