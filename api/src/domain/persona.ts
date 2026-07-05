export interface Persona {
  id: string;
  projectId: string;
  name: string;
  age: number;
  role: string;
  traits: string[];
  background: string;
  sourceDocumentIds: string[];
  avatarSeed: string;
  x: number;
  y: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PersonaSnapshot {
  id: string;
  name: string;
  age: number;
  role: string;
  traits: string[];
  background: string;
  sourceDocumentIds: string[];
  updatedAt: string;
}

export function createPersonaSnapshot(persona: Persona): PersonaSnapshot {
  return {
    id: persona.id,
    name: persona.name,
    age: persona.age,
    role: persona.role,
    traits: [...persona.traits],
    background: persona.background,
    sourceDocumentIds: [...persona.sourceDocumentIds],
    updatedAt: persona.updatedAt.toISOString(),
  };
}
