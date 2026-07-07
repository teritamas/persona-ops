import type { PersonaSnapshot } from '../../../domain/persona.js';
import type { RequirementSnapshot } from '../../../domain/requirement.js';
import type { SuccessfulPersonaReaction } from '../../../domain/simulation.js';

export type SimulationAgentResult = Omit<
  SuccessfulPersonaReaction,
  'simulationId' | 'personaId' | 'personaSnapshot' | 'createdAt' | 'status'
>;

export interface PersonaSimulationAgentPort {
  simulate(input: {
    persona: PersonaSnapshot;
    requirement: RequirementSnapshot;
  }): Promise<SimulationAgentResult>;
}
