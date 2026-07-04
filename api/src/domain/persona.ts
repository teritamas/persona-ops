export interface Persona {
  id: string;
  projectId: string;
  name: string;
  role: string;
  traits: string[];
  background: string;
  avatarSeed: string;
  x: number;
  y: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PersonaSnapshot {
  id: string;
  name: string;
  role: string;
  traits: string[];
  background: string;
  updatedAt: string;
}

export function createPersonaSnapshot(persona: Persona): PersonaSnapshot {
  return {
    id: persona.id,
    name: persona.name,
    role: persona.role,
    traits: [...persona.traits],
    background: persona.background,
    updatedAt: persona.updatedAt.toISOString(),
  };
}
