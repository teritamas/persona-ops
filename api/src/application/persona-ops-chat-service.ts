import { hasUsableSimulationResult } from '../domain/simulation.js';
import type { PersonaOpsAgentPort } from './ports/agents/persona-ops-agent-port.js';
import type { PersonaService } from './persona-service.js';
import type { RequirementService } from './requirement-service.js';
import type { SimulationService } from './simulation-service.js';

export interface SendPersonaOpsMessageRequest {
  projectId: string;
  message: string;
  history: Array<{ role: 'user' | 'agent' | 'persona'; text: string }>;
}

export class PersonaOpsChatService {
  constructor(
    private readonly personaService: PersonaService,
    private readonly requirementService: RequirementService,
    private readonly simulationService: SimulationService,
    private readonly personaOpsAgent: PersonaOpsAgentPort,
  ) {}

  async stream(
    request: SendPersonaOpsMessageRequest,
  ): Promise<AsyncIterable<string>> {
    const [personas, requirements, simulations] = await Promise.all([
      this.personaService.getPersonasByProjectId(request.projectId),
      this.requirementService.list(request.projectId),
      this.simulationService.list(request.projectId),
    ]);

    return this.personaOpsAgent.stream({
      ...request,
      personas,
      requirements,
      recentSimulations: simulations
        .filter((simulation) => hasUsableSimulationResult(simulation.status))
        .slice(0, 5),
    });
  }
}
