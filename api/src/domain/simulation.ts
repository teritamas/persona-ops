import type { PersonaSnapshot } from './persona.js';
import type { RequirementSnapshot } from './requirement.js';

export type SimulationStatus =
  'queued' | 'running' | 'completed' | 'partially_completed' | 'failed';

export const TERMINAL_STATUSES = [
  'completed',
  'partially_completed',
  'failed',
] as const satisfies readonly SimulationStatus[];

export function isTerminalSimulationStatus(status: SimulationStatus): boolean {
  return TERMINAL_STATUSES.some((terminalStatus) => terminalStatus === status);
}

export function hasUsableSimulationResult(status: SimulationStatus): boolean {
  return status === 'completed' || status === 'partially_completed';
}

export type Sentiment = 'positive' | 'neutral' | 'negative';

export interface SimulationSummary {
  averageValueScore: number | null;
  averageAdoptionIntentScore: number | null;
  averageWorkflowFitScore: number | null;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
}

export interface Simulation {
  id: string;
  projectId: string;
  requirementId: string;
  requirementVersion: number;
  requirementSnapshot: RequirementSnapshot;
  personaSnapshots: PersonaSnapshot[];
  status: SimulationStatus;
  model: string;
  targetCount: number;
  successCount: number;
  failureCount: number;
  summary: SimulationSummary;
  leaseExpiresAt?: Date | undefined;
  errorCode?: string | undefined;
  createdAt: Date;
  startedAt?: Date | undefined;
  completedAt?: Date | undefined;
}

interface PersonaReactionBase {
  simulationId: string;
  personaId: string;
  personaSnapshot: PersonaSnapshot;
  createdAt: Date;
}

export interface SuccessfulPersonaReaction extends PersonaReactionBase {
  status: 'completed';
  sentiment: Sentiment;
  shortFeedback: string;
  detailedFeedback: string;
  workImage: string;
  concerns: string[];
}

export interface FailedPersonaReaction extends PersonaReactionBase {
  status: 'failed';
  errorCode: string;
  errorMessage: string;
}

export type PersonaReaction = SuccessfulPersonaReaction | FailedPersonaReaction;

export const EMPTY_SIMULATION_SUMMARY: SimulationSummary = {
  averageValueScore: null,
  averageAdoptionIntentScore: null,
  averageWorkflowFitScore: null,
  positiveCount: 0,
  neutralCount: 0,
  negativeCount: 0,
};

export function summarizeReactions(
  reactions: PersonaReaction[],
): SimulationSummary {
  const successful = reactions.filter(
    (reaction): reaction is SuccessfulPersonaReaction =>
      reaction.status === 'completed',
  );
  if (successful.length === 0) {
    return EMPTY_SIMULATION_SUMMARY;
  }

  return {
    averageValueScore: null,
    averageAdoptionIntentScore: null,
    averageWorkflowFitScore: null,
    positiveCount: successful.filter(
      (reaction) => reaction.sentiment === 'positive',
    ).length,
    neutralCount: successful.filter(
      (reaction) => reaction.sentiment === 'neutral',
    ).length,
    negativeCount: successful.filter(
      (reaction) => reaction.sentiment === 'negative',
    ).length,
  };
}
