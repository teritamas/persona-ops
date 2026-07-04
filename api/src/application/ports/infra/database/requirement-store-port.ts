import type { Requirement } from '../../../../domain/requirement.js';

export interface RequirementStorePort {
  save(requirement: Requirement): Promise<void>;
  findById(
    projectId: string,
    requirementId: string,
  ): Promise<Requirement | null>;
  findByProjectId(projectId: string): Promise<Requirement[]>;
  delete(projectId: string, requirementId: string): Promise<void>;
}
