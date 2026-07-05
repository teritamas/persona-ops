import { randomUUID } from 'node:crypto';

import { NotFoundError, ValidationError } from '../domain/errors.js';
import type { Requirement } from '../domain/requirement.js';
import { hasUsableSimulationResult } from '../domain/simulation.js';
import type { RequirementStorePort } from './ports/infra/database/requirement-store-port.js';
import type { SimulationStorePort } from './ports/infra/database/simulation-store-port.js';
import type { SourceDocumentRepositoryPort } from './ports/infra/database/source-document-repository-port.js';
import { validateSourceDocumentReferences } from './source-document/validate-source-document-references.js';

export interface SaveRequirementInput {
  id?: string | undefined;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  sourceDocumentIds?: string[] | undefined;
  sourceSimulationIds?: string[] | undefined;
}

export class RequirementService {
  constructor(
    private readonly requirementRepository: RequirementStorePort,
    private readonly simulationStore: SimulationStorePort,
    private readonly sourceDocumentRepository: SourceDocumentRepositoryPort,
  ) {}

  async saveDraft(
    projectId: string,
    input: SaveRequirementInput,
  ): Promise<Requirement> {
    const now = new Date();
    if (input.id) {
      const existing = await this.requirementRepository.findById(
        projectId,
        input.id,
      );
      if (!existing) {
        throw new NotFoundError('Requirement', input.id);
      }
      const sourceDocumentIds =
        input.sourceDocumentIds ?? existing.sourceDocumentIds;
      const sourceSimulationIds =
        input.sourceSimulationIds ?? existing.sourceSimulationIds;
      await this.validateReferences(
        projectId,
        sourceDocumentIds,
        sourceSimulationIds,
      );
      const updated: Requirement = {
        ...existing,
        title: input.title,
        description: input.description,
        acceptanceCriteria: [...input.acceptanceCriteria],
        sourceDocumentIds: [...sourceDocumentIds],
        sourceSimulationIds: [...sourceSimulationIds],
        status: 'draft',
        version: existing.version + 1,
        approvedAt: undefined,
        updatedAt: now,
      };
      await this.requirementRepository.save(updated);
      return updated;
    }

    const sourceDocumentIds = input.sourceDocumentIds ?? [];
    const sourceSimulationIds = input.sourceSimulationIds ?? [];
    await this.validateReferences(
      projectId,
      sourceDocumentIds,
      sourceSimulationIds,
    );
    const requirement: Requirement = {
      id: `req_${randomUUID()}`,
      projectId,
      title: input.title,
      description: input.description,
      acceptanceCriteria: [...input.acceptanceCriteria],
      sourceDocumentIds: [...sourceDocumentIds],
      sourceSimulationIds: [...sourceSimulationIds],
      status: 'draft',
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    await this.requirementRepository.save(requirement);
    return requirement;
  }

  private async validateReferences(
    projectId: string,
    sourceDocumentIds: string[],
    sourceSimulationIds: string[],
  ): Promise<void> {
    await validateSourceDocumentReferences(
      this.sourceDocumentRepository,
      projectId,
      sourceDocumentIds,
    );
    for (const simulationId of sourceSimulationIds) {
      const simulation = await this.simulationStore.findById(
        projectId,
        simulationId,
      );
      if (!simulation || !hasUsableSimulationResult(simulation.status)) {
        throw new ValidationError(
          `参照可能なシミュレーションではありません: ${simulationId}`,
        );
      }
    }
  }

  async getById(
    projectId: string,
    requirementId: string,
  ): Promise<Requirement> {
    const requirement = await this.requirementRepository.findById(
      projectId,
      requirementId,
    );
    if (!requirement) {
      throw new NotFoundError('Requirement', requirementId);
    }
    return requirement;
  }

  async list(projectId: string): Promise<Requirement[]> {
    return this.requirementRepository.findByProjectId(projectId);
  }

  async delete(projectId: string, requirementId: string): Promise<void> {
    await this.getById(projectId, requirementId);
    const simulations = await this.simulationStore.findByProjectId(projectId);
    const relatedSimulations = simulations.filter(
      (sim) => sim.requirementId === requirementId,
    );

    for (const sim of relatedSimulations) {
      await this.simulationStore.delete(projectId, sim.id);
    }

    await this.requirementRepository.delete(projectId, requirementId);
  }
}
