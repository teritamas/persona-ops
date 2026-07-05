import { randomUUID } from 'node:crypto';

import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../domain/errors.js';
import { createPersonaSnapshot } from '../domain/persona.js';
import type { PersonaStorePort } from './ports/infra/database/persona-store-port.js';
import { createRequirementSnapshot } from '../domain/requirement.js';
import type { RequirementStorePort } from './ports/infra/database/requirement-store-port.js';
import {
  EMPTY_SIMULATION_SUMMARY,
  summarizeReactions,
  type FailedPersonaReaction,
  type PersonaReaction,
  type Simulation,
} from '../domain/simulation.js';
import type { SimulationStorePort } from './ports/infra/database/simulation-store-port.js';
import type { PersonaSimulationAgentPort } from './ports/agents/persona-simulation-agent-port.js';
import type { SimulationQueuePort } from './ports/infra/queue/simulation-queue-port.js';

const LEASE_DURATION_MS = 4 * 60 * 1000;
const PERSONA_CONCURRENCY = 3;
const MAX_PERSONA_ATTEMPTS = 2;

export class SimulationService {
  constructor(
    private readonly requirementRepository: RequirementStorePort,
    private readonly personaRepository: PersonaStorePort,
    private readonly simulationRepository: SimulationStorePort,
    private readonly simulationAgent: PersonaSimulationAgentPort,
    private readonly simulationQueue: SimulationQueuePort,
    private readonly model: string,
  ) {}

  async request(projectId: string, requirementId: string): Promise<Simulation> {
    const requirement = await this.requirementRepository.findById(
      projectId,
      requirementId,
    );
    if (!requirement) {
      throw new NotFoundError('Requirement', requirementId);
    }
    if (requirement.status !== 'draft') {
      throw new ConflictError(
        '承認済み要件を再実行するには、要件を更新してdraftへ戻してください。',
      );
    }

    const personas = await this.personaRepository.findByProjectId(projectId);
    if (personas.length === 0) {
      throw new ValidationError(
        'シミュレーションには1件以上のペルソナが必要です。',
      );
    }

    const active = await this.simulationRepository.findActiveByRequirement(
      projectId,
      requirementId,
    );
    if (active) {
      throw new ConflictError(
        'この要件のシミュレーションはすでに実行待ちまたは実行中です。',
      );
    }

    const now = new Date();
    const simulation: Simulation = {
      id: `sim_${randomUUID()}`,
      projectId,
      requirementId,
      requirementVersion: requirement.version,
      requirementSnapshot: createRequirementSnapshot(requirement),
      personaSnapshots: personas.map(createPersonaSnapshot),
      status: 'queued',
      model: this.model,
      targetCount: personas.length,
      successCount: 0,
      failureCount: 0,
      summary: EMPTY_SIMULATION_SUMMARY,
      createdAt: now,
    };

    await this.requirementRepository.save({
      ...requirement,
      status: 'approved',
      approvedAt: now,
      updatedAt: now,
    });
    await this.simulationRepository.save(simulation);

    try {
      await this.simulationQueue.enqueue({
        projectId,
        simulationId: simulation.id,
      });
    } catch (error) {
      await this.simulationRepository.updateResult(projectId, simulation.id, {
        status: 'failed',
        successCount: 0,
        failureCount: personas.length,
        summary: EMPTY_SIMULATION_SUMMARY,
        completedAt: new Date(),
        errorCode: 'QUEUE_ENQUEUE_FAILED',
      });
      throw error;
    }
    return simulation;
  }

  async run(projectId: string, simulationId: string): Promise<'done' | 'busy'> {
    const now = new Date();
    const claim = await this.simulationRepository.claim(
      projectId,
      simulationId,
      now,
      new Date(now.getTime() + LEASE_DURATION_MS),
    );
    if (claim === 'terminal') {
      return 'done';
    }
    if (claim === 'busy') {
      return 'busy';
    }

    try {
      await this.processClaimedSimulation(projectId, simulationId);
      return 'done';
    } catch (error) {
      await this.simulationRepository.release(
        projectId,
        simulationId,
        'TASK_EXECUTION_INTERRUPTED',
      );
      throw error;
    }
  }

  private async processClaimedSimulation(
    projectId: string,
    simulationId: string,
  ): Promise<void> {
    const simulation = await this.simulationRepository.findById(
      projectId,
      simulationId,
    );
    if (!simulation) {
      throw new NotFoundError('Simulation', simulationId);
    }
    const existing = await this.simulationRepository.findReactions(
      projectId,
      simulationId,
    );
    const completedIds = new Set(
      existing
        .filter((reaction) => reaction.status === 'completed')
        .map((reaction) => reaction.personaId),
    );
    const pending = simulation.personaSnapshots.filter(
      (persona) => !completedIds.has(persona.id),
    );

    for (let index = 0; index < pending.length; index += PERSONA_CONCURRENCY) {
      const batch = pending.slice(index, index + PERSONA_CONCURRENCY);
      await Promise.all(
        batch.map(async (persona) => {
          const reaction = await this.simulatePersona(simulation, persona);
          await this.simulationRepository.saveReaction(projectId, reaction);
        }),
      );
    }

    const reactions = await this.simulationRepository.findReactions(
      projectId,
      simulationId,
    );
    const successCount = reactions.filter(
      (reaction) => reaction.status === 'completed',
    ).length;
    const failureCount = simulation.targetCount - successCount;
    const status =
      successCount === simulation.targetCount
        ? 'completed'
        : successCount === 0
          ? 'failed'
          : 'partially_completed';

    await this.simulationRepository.updateResult(projectId, simulationId, {
      status,
      successCount,
      failureCount,
      summary: summarizeReactions(reactions),
      completedAt: new Date(),
      errorCode:
        status === 'failed' ? 'ALL_PERSONA_SIMULATIONS_FAILED' : undefined,
    });
  }

  async list(projectId: string): Promise<Simulation[]> {
    return this.simulationRepository.findByProjectId(projectId);
  }

  async delete(projectId: string, simulationId: string): Promise<void> {
    const simulation = await this.simulationRepository.findById(
      projectId,
      simulationId,
    );
    if (!simulation) {
      throw new NotFoundError('Simulation', simulationId);
    }
    await this.simulationRepository.delete(projectId, simulationId);
  }

  async getDetail(
    projectId: string,
    simulationId: string,
  ): Promise<{ simulation: Simulation; reactions: PersonaReaction[] }> {
    const simulation = await this.simulationRepository.findById(
      projectId,
      simulationId,
    );
    if (!simulation) {
      throw new NotFoundError('Simulation', simulationId);
    }
    return {
      simulation,
      reactions: await this.simulationRepository.findReactions(
        projectId,
        simulationId,
      ),
    };
  }

  async #simulateWithRetry(
    simulation: Simulation,
    persona: Simulation['personaSnapshots'][number],
  ) {
    let lastError: unknown;
    for (let attempt = 1; attempt <= MAX_PERSONA_ATTEMPTS; attempt += 1) {
      try {
        return await this.simulationAgent.simulate({
          persona,
          requirement: simulation.requirementSnapshot,
        });
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError;
  }

  async simulatePersona(
    simulation: Simulation,
    persona: Simulation['personaSnapshots'][number],
  ): Promise<PersonaReaction> {
    try {
      const result = await this.#simulateWithRetry(simulation, persona);
      return {
        simulationId: simulation.id,
        personaId: persona.id,
        personaSnapshot: persona,
        status: 'completed',
        ...result,
        createdAt: new Date(),
      };
    } catch (error) {
      const failed: FailedPersonaReaction = {
        simulationId: simulation.id,
        personaId: persona.id,
        personaSnapshot: persona,
        status: 'failed',
        errorCode: 'PERSONA_SIMULATION_FAILED',
        errorMessage:
          error instanceof Error ? error.message : 'Unknown simulation error',
        createdAt: new Date(),
      };
      return failed;
    }
  }
}
