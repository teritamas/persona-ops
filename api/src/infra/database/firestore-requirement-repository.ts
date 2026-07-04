import type { Firestore } from '@google-cloud/firestore';

import type { Requirement } from '../../domain/requirement.js';
import type { RequirementStorePort } from '../../application/ports/infra/database/requirement-store-port.js';

export class FirestoreRequirementRepository implements RequirementStorePort {
  constructor(private readonly firestore: Firestore) {}

  async save(requirement: Requirement): Promise<void> {
    await this.collection(requirement.projectId)
      .doc(requirement.id)
      .set({
        projectId: requirement.projectId,
        title: requirement.title,
        description: requirement.description,
        acceptanceCriteria: requirement.acceptanceCriteria,
        sourceSimulationIds: requirement.sourceSimulationIds,
        status: requirement.status,
        version: requirement.version,
        approvedAt: requirement.approvedAt?.toISOString() ?? null,
        createdAt: requirement.createdAt.toISOString(),
        updatedAt: requirement.updatedAt.toISOString(),
      });
  }

  async findById(
    projectId: string,
    requirementId: string,
  ): Promise<Requirement | null> {
    const document = await this.collection(projectId).doc(requirementId).get();
    return document.exists
      ? this.mapDocument(projectId, document.id, document.data() ?? {})
      : null;
  }

  async findByProjectId(projectId: string): Promise<Requirement[]> {
    const snapshot = await this.collection(projectId).get();
    return snapshot.docs
      .map((document) =>
        this.mapDocument(projectId, document.id, document.data()),
      )
      .sort(
        (left, right) => right.updatedAt.getTime() - left.updatedAt.getTime(),
      );
  }

  private collection(projectId: string) {
    return this.firestore
      .collection('projects')
      .doc(projectId)
      .collection('requirements');
  }

  private mapDocument(
    projectId: string,
    id: string,
    data: Record<string, unknown>,
  ): Requirement {
    const approvedAt =
      typeof data.approvedAt === 'string'
        ? new Date(data.approvedAt)
        : undefined;
    return {
      id,
      projectId,
      title: String(data.title),
      description: String(data.description),
      acceptanceCriteria: Array.isArray(data.acceptanceCriteria)
        ? data.acceptanceCriteria.map((value) => String(value))
        : [],
      sourceSimulationIds: Array.isArray(data.sourceSimulationIds)
        ? data.sourceSimulationIds.map((value) => String(value))
        : [],
      status: data.status === 'approved' ? 'approved' : 'draft',
      version: Number(data.version),
      approvedAt,
      createdAt: new Date(String(data.createdAt)),
      updatedAt: new Date(String(data.updatedAt)),
    };
  }
}
