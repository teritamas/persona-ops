export type RequirementStatus = 'draft' | 'approved';

export interface Requirement {
  id: string;
  projectId: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  sourceSimulationIds: string[];
  status: RequirementStatus;
  version: number;
  approvedAt?: Date | undefined;
  createdAt: Date;
  updatedAt: Date;
}

export interface RequirementSnapshot {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  sourceSimulationIds: string[];
  version: number;
}

export function createRequirementSnapshot(
  requirement: Requirement,
): RequirementSnapshot {
  return {
    id: requirement.id,
    title: requirement.title,
    description: requirement.description,
    acceptanceCriteria: [...requirement.acceptanceCriteria],
    sourceSimulationIds: [...requirement.sourceSimulationIds],
    version: requirement.version,
  };
}
