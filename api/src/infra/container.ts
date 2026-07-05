import { Firestore } from '@google-cloud/firestore';
import { ProjectService } from '../application/project-service.js';
import { FirestoreProjectRepository } from './database/firestore-project-repository.js';
import { PersonaService } from '../application/persona-service.js';
import { FirestorePersonaRepository } from './database/firestore-persona-repository.js';
import { FirestoreSourceDocumentRepository } from './database/firestore-source-document-repository.js';
import { HttpDocumentFetcher } from './document/http-document-fetcher.js';
import { SourceDocumentService } from '../application/source-document/source-document-service.js';

import { AdkPersonaOpsAgent } from '../agents/persona-ops-agent/agent.js';
import { AdkPersonaSimulationAgent } from '../agents/simulation-agent/agent.js';
import { PersonaOpsChatService } from '../application/persona-ops-chat-service.js';
import type { AiAgentPort } from '../application/ports/infra/ai/ai-agent-port.js';
import { RequirementService } from '../application/requirement-service.js';
import { SimulationService } from '../application/simulation-service.js';
import type { AppConfig } from '../config.js';
import { AdkAiAgent } from './ai/adk-ai-agent.js';
import { FirestoreRequirementRepository } from './database/firestore-requirement-repository.js';
import { FirestoreSimulationRepository } from './database/firestore-simulation-repository.js';
import { FirestoreProjectDataDeletion } from './database/firestore-project-data-deletion.js';
import { createCloudTasksSimulationQueue } from './queue/cloud-tasks-simulation-queue.js';
import { LocalSimulationQueue } from './queue/local-simulation-queue.js';

export type Container = {
  aiAgent: AiAgentPort;
  projectService: ProjectService;
  personaService: PersonaService;
  requirementService: RequirementService;
  simulationService: SimulationService;
  personaOpsChatService: PersonaOpsChatService;
  sourceDocumentService: SourceDocumentService;
};

export function buildContainer(config: AppConfig): Container {
  const firestore = new Firestore({ projectId: config.GOOGLE_CLOUD_PROJECT });
  const projectRepository = new FirestoreProjectRepository(firestore);
  const personaRepository = new FirestorePersonaRepository(firestore);
  const requirementRepository = new FirestoreRequirementRepository(firestore);
  const simulationRepository = new FirestoreSimulationRepository(firestore);

  const sourceDocumentRepository = new FirestoreSourceDocumentRepository(
    firestore,
  );
  const documentFetcher = new HttpDocumentFetcher();
  const sourceDocumentService = new SourceDocumentService(
    sourceDocumentRepository,
    documentFetcher,
  );

  const aiAgent = new AdkAiAgent({
    model: config.VERTEX_AI_MODEL,
  });

  const personaService = new PersonaService(
    personaRepository,
    sourceDocumentRepository,
  );
  const requirementService = new RequirementService(
    requirementRepository,
    simulationRepository,
    sourceDocumentRepository,
  );

  const simulationQueue =
    config.SIMULATION_QUEUE_DRIVER === 'local'
      ? new LocalSimulationQueue(config.LOCAL_TASK_BASE_URL)
      : createCloudTasksSimulationQueue({
          projectId: config.GOOGLE_CLOUD_PROJECT,
          location: config.GOOGLE_CLOUD_LOCATION,
          queue: config.SIMULATION_QUEUE,
        });

  const simulationService = new SimulationService(
    requirementRepository,
    personaRepository,
    simulationRepository,
    new AdkPersonaSimulationAgent(config.VERTEX_AI_MODEL),
    simulationQueue,
    config.VERTEX_AI_MODEL,
  );

  const personaOpsAgent = new AdkPersonaOpsAgent(
    config.VERTEX_AI_MODEL,
    personaService,
    requirementService,
    simulationService,
    sourceDocumentService,
  );

  return {
    aiAgent,
    projectService: new ProjectService(
      projectRepository,
      new FirestoreProjectDataDeletion(firestore),
    ),
    personaService,
    requirementService,
    simulationService,
    personaOpsChatService: new PersonaOpsChatService(
      personaService,
      requirementService,
      simulationService,
      sourceDocumentService,
      personaOpsAgent,
    ),
    sourceDocumentService,
  };
}
