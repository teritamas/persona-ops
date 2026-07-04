import type { Firestore } from '@google-cloud/firestore';

import {
  isTerminalSimulationStatus,
  type PersonaReaction,
  type Simulation,
  type SimulationStatus,
  type SimulationSummary,
} from '../../domain/simulation.js';
import type {
  SimulationClaimResult,
  SimulationStorePort,
} from '../../application/ports/infra/database/simulation-store-port.js';

export class FirestoreSimulationRepository implements SimulationStorePort {
  constructor(private readonly firestore: Firestore) {}

  async save(simulation: Simulation): Promise<void> {
    await this.simulationDocument(simulation.projectId, simulation.id).set(
      this.toSimulationData(simulation),
    );
  }

  async findById(
    projectId: string,
    simulationId: string,
  ): Promise<Simulation | null> {
    const document = await this.simulationDocument(
      projectId,
      simulationId,
    ).get();
    return document.exists
      ? this.mapSimulation(projectId, document.id, document.data() ?? {})
      : null;
  }

  async findByProjectId(projectId: string): Promise<Simulation[]> {
    const snapshot = await this.simulations(projectId).get();
    return snapshot.docs
      .map((document) =>
        this.mapSimulation(projectId, document.id, document.data()),
      )
      .sort(
        (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
      );
  }

  async findActiveByRequirement(
    projectId: string,
    requirementId: string,
  ): Promise<Simulation | null> {
    const snapshot = await this.simulations(projectId)
      .where('requirementId', '==', requirementId)
      .where('status', 'in', ['queued', 'running'])
      .limit(1)
      .get();
    const document = snapshot.docs[0];
    return document
      ? this.mapSimulation(projectId, document.id, document.data())
      : null;
  }

  async claim(
    projectId: string,
    simulationId: string,
    now: Date,
    leaseExpiresAt: Date,
  ): Promise<SimulationClaimResult> {
    const reference = this.simulationDocument(projectId, simulationId);
    return this.firestore.runTransaction(async (transaction) => {
      const document = await transaction.get(reference);
      if (!document.exists) {
        throw new Error(`Simulation "${simulationId}" was not found.`);
      }
      const data = document.data() ?? {};
      const status = String(data.status) as SimulationStatus;
      if (isTerminalSimulationStatus(status)) {
        return 'terminal';
      }
      const currentLease =
        typeof data.leaseExpiresAt === 'string'
          ? new Date(data.leaseExpiresAt)
          : undefined;
      if (
        status === 'running' &&
        currentLease &&
        currentLease.getTime() > now.getTime()
      ) {
        return 'busy';
      }
      transaction.update(reference, {
        status: 'running',
        startedAt:
          typeof data.startedAt === 'string'
            ? data.startedAt
            : now.toISOString(),
        leaseExpiresAt: leaseExpiresAt.toISOString(),
      });
      return 'claimed';
    });
  }

  async updateResult(
    projectId: string,
    simulationId: string,
    update: {
      status: SimulationStatus;
      successCount: number;
      failureCount: number;
      summary: SimulationSummary;
      completedAt: Date;
      errorCode?: string;
    },
  ): Promise<void> {
    await this.simulationDocument(projectId, simulationId).update({
      status: update.status,
      successCount: update.successCount,
      failureCount: update.failureCount,
      summary: update.summary,
      completedAt: update.completedAt.toISOString(),
      leaseExpiresAt: null,
      errorCode: update.errorCode ?? null,
    });
  }

  async release(
    projectId: string,
    simulationId: string,
    errorCode: string,
  ): Promise<void> {
    await this.simulationDocument(projectId, simulationId).update({
      status: 'queued',
      leaseExpiresAt: null,
      errorCode,
    });
  }

  async saveReaction(
    projectId: string,
    reaction: PersonaReaction,
  ): Promise<void> {
    const base = {
      simulationId: reaction.simulationId,
      personaId: reaction.personaId,
      personaSnapshot: reaction.personaSnapshot,
      status: reaction.status,
      createdAt: reaction.createdAt.toISOString(),
    };
    const data =
      reaction.status === 'completed'
        ? {
            ...base,
            sentiment: reaction.sentiment,
            valueScore: reaction.valueScore,
            adoptionIntentScore: reaction.adoptionIntentScore,
            workflowFitScore: reaction.workflowFitScore,
            feedback: reaction.feedback,
            benefits: reaction.benefits,
            concerns: reaction.concerns,
            suggestedChanges: reaction.suggestedChanges,
          }
        : {
            ...base,
            errorCode: reaction.errorCode,
            errorMessage: reaction.errorMessage,
          };
    await this.reactions(projectId, reaction.simulationId)
      .doc(reaction.personaId)
      .set(data);
  }

  async findReactions(
    projectId: string,
    simulationId: string,
  ): Promise<PersonaReaction[]> {
    const snapshot = await this.reactions(projectId, simulationId).get();
    return snapshot.docs.map((document) => {
      const data = document.data();
      const base = {
        simulationId,
        personaId: document.id,
        personaSnapshot:
          data.personaSnapshot as PersonaReaction['personaSnapshot'],
        createdAt: new Date(String(data.createdAt)),
      };
      if (data.status === 'completed') {
        return {
          ...base,
          status: 'completed',
          sentiment: data.sentiment as 'positive' | 'neutral' | 'negative',
          valueScore: Number(data.valueScore),
          adoptionIntentScore: Number(data.adoptionIntentScore),
          workflowFitScore: Number(data.workflowFitScore),
          feedback: String(data.feedback),
          benefits: this.stringArray(data.benefits),
          concerns: this.stringArray(data.concerns),
          suggestedChanges: this.stringArray(data.suggestedChanges),
        };
      }
      return {
        ...base,
        status: 'failed',
        errorCode: String(data.errorCode),
        errorMessage: String(data.errorMessage),
      };
    });
  }

  private simulations(projectId: string) {
    return this.firestore
      .collection('projects')
      .doc(projectId)
      .collection('simulations');
  }

  private simulationDocument(projectId: string, simulationId: string) {
    return this.simulations(projectId).doc(simulationId);
  }

  private reactions(projectId: string, simulationId: string) {
    return this.simulationDocument(projectId, simulationId).collection(
      'reactions',
    );
  }

  private toSimulationData(simulation: Simulation): Record<string, unknown> {
    return {
      projectId: simulation.projectId,
      requirementId: simulation.requirementId,
      requirementVersion: simulation.requirementVersion,
      requirementSnapshot: simulation.requirementSnapshot,
      personaSnapshots: simulation.personaSnapshots,
      status: simulation.status,
      model: simulation.model,
      targetCount: simulation.targetCount,
      successCount: simulation.successCount,
      failureCount: simulation.failureCount,
      summary: simulation.summary,
      leaseExpiresAt: simulation.leaseExpiresAt?.toISOString() ?? null,
      errorCode: simulation.errorCode ?? null,
      createdAt: simulation.createdAt.toISOString(),
      startedAt: simulation.startedAt?.toISOString() ?? null,
      completedAt: simulation.completedAt?.toISOString() ?? null,
    };
  }

  private mapSimulation(
    projectId: string,
    id: string,
    data: Record<string, unknown>,
  ): Simulation {
    const parseOptionalDate = (value: unknown): Date | undefined =>
      typeof value === 'string' ? new Date(value) : undefined;
    return {
      id,
      projectId,
      requirementId: String(data.requirementId),
      requirementVersion: Number(data.requirementVersion),
      requirementSnapshot:
        data.requirementSnapshot as Simulation['requirementSnapshot'],
      personaSnapshots: data.personaSnapshots as Simulation['personaSnapshots'],
      status: String(data.status) as SimulationStatus,
      model: String(data.model),
      targetCount: Number(data.targetCount),
      successCount: Number(data.successCount),
      failureCount: Number(data.failureCount),
      summary: data.summary as SimulationSummary,
      leaseExpiresAt: parseOptionalDate(data.leaseExpiresAt),
      errorCode:
        typeof data.errorCode === 'string' ? data.errorCode : undefined,
      createdAt: new Date(String(data.createdAt)),
      startedAt: parseOptionalDate(data.startedAt),
      completedAt: parseOptionalDate(data.completedAt),
    };
  }

  private stringArray(value: unknown): string[] {
    return Array.isArray(value) ? value.map((item) => String(item)) : [];
  }

  async delete(projectId: string, simulationId: string): Promise<void> {
    const simulationRef = this.simulationDocument(projectId, simulationId);
    const snapshot = await this.reactions(projectId, simulationId).get();
    const batch = this.firestore.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    batch.delete(simulationRef);
    await batch.commit();
  }
}
