import type {
  PersonaReaction,
  Simulation,
  SimulationStatus,
} from '../../../../domain/simulation.js';

export type SimulationClaimResult = 'claimed' | 'busy' | 'terminal';

export interface SimulationStorePort {
  save(simulation: Simulation): Promise<void>;
  findById(projectId: string, simulationId: string): Promise<Simulation | null>;
  findByProjectId(projectId: string): Promise<Simulation[]>;
  findActiveByRequirement(
    projectId: string,
    requirementId: string,
  ): Promise<Simulation | null>;
  claim(
    projectId: string,
    simulationId: string,
    now: Date,
    leaseExpiresAt: Date,
  ): Promise<SimulationClaimResult>;
  release(
    projectId: string,
    simulationId: string,
    errorCode: string,
  ): Promise<void>;
  updateResult(
    projectId: string,
    simulationId: string,
    update: {
      status: SimulationStatus;
      successCount: number;
      failureCount: number;
      summary: Simulation['summary'];
      completedAt: Date;
      errorCode?: string | undefined;
    },
  ): Promise<void>;
  saveReaction(projectId: string, reaction: PersonaReaction): Promise<void>;
  findReactions(
    projectId: string,
    simulationId: string,
  ): Promise<PersonaReaction[]>;
}
