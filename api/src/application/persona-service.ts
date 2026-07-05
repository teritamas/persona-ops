import { randomUUID } from 'node:crypto';

import { NotFoundError } from '../domain/errors.js';
import type { Persona } from '../domain/persona.js';
import type { PersonaStorePort } from './ports/infra/database/persona-store-port.js';
import type { SourceDocumentRepositoryPort } from './ports/infra/database/source-document-repository-port.js';
import { validateSourceDocumentReferences } from './source-document/validate-source-document-references.js';

export interface SavePersonaInput {
  id?: string | undefined;
  name: string;
  role: string;
  traits: string[];
  background: string;
  sourceDocumentIds?: string[] | undefined;
  avatarSeed?: string | undefined;
}

const AVATARS = ['Felix', 'Aneka', 'Jasper', 'Avery', 'Leo'] as const;
const COORDINATES = [
  { x: 20, y: 30 },
  { x: 70, y: 40 },
  { x: 45, y: 60 },
  { x: 80, y: 70 },
  { x: 30, y: 80 },
] as const;

export class PersonaService {
  constructor(
    private readonly personaRepository: PersonaStorePort,
    private readonly sourceDocumentRepository: SourceDocumentRepositoryPort,
  ) {}

  async getPersonasByProjectId(projectId: string): Promise<Persona[]> {
    return this.personaRepository.findByProjectId(projectId);
  }

  async savePersonas(
    projectId: string,
    inputs: SavePersonaInput[],
  ): Promise<{ addedCount: number; updatedCount: number }> {
    const existing = await this.personaRepository.findByProjectId(projectId);
    const now = new Date();
    let addedCount = 0;
    let updatedCount = 0;

    for (const [index, input] of inputs.entries()) {
      const matched = input.id
        ? existing.find((persona) => persona.id === input.id)
        : existing.find(
            (persona) =>
              persona.name === input.name && persona.role === input.role,
          );
      const sourceDocumentIds =
        input.sourceDocumentIds ?? matched?.sourceDocumentIds ?? [];
      await validateSourceDocumentReferences(
        this.sourceDocumentRepository,
        projectId,
        sourceDocumentIds,
      );

      if (matched) {
        await this.personaRepository.save({
          ...matched,
          name: input.name,
          role: input.role,
          traits: [...input.traits],
          background: input.background,
          sourceDocumentIds: [...sourceDocumentIds],
          avatarSeed: input.avatarSeed || matched.avatarSeed,
          updatedAt: now,
        });
        updatedCount += 1;
        continue;
      }

      const coordinate = COORDINATES[index % COORDINATES.length]!;
      await this.personaRepository.save({
        id: `pers_${randomUUID()}`,
        projectId,
        name: input.name,
        role: input.role,
        traits: [...input.traits],
        background: input.background,
        sourceDocumentIds: [...sourceDocumentIds],
        avatarSeed: input.avatarSeed || AVATARS[index % AVATARS.length]!,
        x: coordinate.x,
        y: coordinate.y,
        createdAt: now,
        updatedAt: now,
      });
      addedCount += 1;
    }

    return { addedCount, updatedCount };
  }

  async updatePersonaPosition(
    projectId: string,
    personaId: string,
    x: number,
    y: number,
  ): Promise<Persona> {
    const personas = await this.personaRepository.findByProjectId(projectId);
    const persona = personas.find((p) => p.id === personaId);
    if (!persona) {
      throw new NotFoundError('Persona', personaId);
    }
    const updated = {
      ...persona,
      x,
      y,
      updatedAt: new Date(),
    };
    await this.personaRepository.save(updated);
    return updated;
  }
}
