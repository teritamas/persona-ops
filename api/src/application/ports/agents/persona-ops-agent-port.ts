import type { Persona } from '../../../domain/persona.js';
import type { Requirement } from '../../../domain/requirement.js';
import type { Simulation } from '../../../domain/simulation.js';

export interface PersonaOpsAgentInput {
  projectId: string;
  message: string;
  history: Array<{ role: 'user' | 'agent' | 'persona'; text: string }>;
  personas: Persona[];
  requirements: Requirement[];
  recentSimulations: Simulation[];
}

export interface PersonaOpsAgentPort {
  stream(input: PersonaOpsAgentInput): AsyncIterable<string>;
}
