import { z } from 'zod';
import { FunctionTool } from '@google/adk';
import { randomUUID } from 'node:crypto';
import type { PersonaRepositoryPort } from '../../../application/ports/persona-repository-port.js';
import type { Persona } from '../../../domain/persona.js';

export function createSavePersonasTool(personaRepository: PersonaRepositoryPort) {
  return new FunctionTool({
    name: 'save_personas_tool',
    description: 'Saves or updates virtual personas to the database for a given project. Use this tool when you have finalized the list of personas based on user requirements.',
    parameters: z.object({
      projectId: z.string().describe('The ID of the project to save the personas for.'),
      personas: z.array(z.object({
        name: z.string(),
        role: z.string(),
        traits: z.array(z.string()),
        background: z.string(),
      })).describe('The list of personas to save or update. Name or role will be used to identify existing personas for upsert.'),
    }),
    execute: async (input) => {
      const { projectId, personas } = input;
      const existingPersonas = await personaRepository.findByProjectId(projectId);
      const avatars = ['Felix', 'Aneka', 'Jasper', 'Avery', 'Leo'];
      const coordinates = [
        { x: 20, y: 30 }, { x: 70, y: 40 }, { x: 45, y: 60 }, { x: 80, y: 70 },
        { x: 30, y: 80 }, { x: 55, y: 25 }, { x: 15, y: 60 },
      ];
      const now = new Date();
      let addedCount = 0;
      let updatedCount = 0;

      for (let i = 0; i < personas.length; i++) {
        const pData = personas[i]!;
        // Match by name or role for upsert logic
        const existing = existingPersonas.find(ep => ep.name === pData.name || ep.role === pData.role);

        if (existing) {
          // Update
          existing.name = pData.name;
          existing.role = pData.role;
          existing.traits = pData.traits;
          existing.background = pData.background;
          existing.updatedAt = now;
          await personaRepository.save(existing);
          updatedCount++;
        } else {
          // Insert
          const coord = coordinates[i % coordinates.length]!;
          const avatarSeed = avatars[i % avatars.length]!;
          const jitterX = Math.floor(Math.random() * 6) - 3;
          const jitterY = Math.floor(Math.random() * 6) - 3;

          const newPersona: Persona = {
            id: `pers_${randomUUID()}`,
            projectId,
            name: pData.name,
            role: pData.role,
            traits: pData.traits,
            background: pData.background,
            avatarSeed,
            x: Math.max(10, Math.min(90, coord.x + jitterX)),
            y: Math.max(10, Math.min(90, coord.y + jitterY)),
            createdAt: now,
            updatedAt: now,
          };
          await personaRepository.save(newPersona);
          addedCount++;
        }
      }

      return `Successfully added ${addedCount} and updated ${updatedCount} personas.`;
    }
  });
}
