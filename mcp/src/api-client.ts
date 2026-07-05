export interface ProjectDto {
  id: string;
  name: string;
}

export interface RequirementDto {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  status: string;
}

export interface PersonaSnapshotDto {
  name: string;
}

export interface ReactionDto {
  personaSnapshot?: PersonaSnapshotDto;
  status: 'completed' | 'failed';
  sentiment?: 'positive' | 'neutral' | 'negative';
  shortFeedback?: string;
  detailedFeedback?: string;
  concerns?: string[];
  errorMessage?: string;
  errorCode?: string;
}

export interface SimulationDto {
  id: string;
  reactions: ReactionDto[];
}

export class ApiClient {
  constructor(private readonly baseUrl: string) {}

  async listProjects(): Promise<ProjectDto[]> {
    const res = await fetch(`${this.baseUrl}/api/v1/projects`);
    if (!res.ok) {
      throw new Error(`Failed to list projects: ${res.statusText}`);
    }
    return res.json() as Promise<ProjectDto[]>;
  }

  async listRequirements(projectId: string): Promise<RequirementDto[]> {
    const res = await fetch(`${this.baseUrl}/api/v1/projects/${projectId}/requirements`);
    if (!res.ok) {
      throw new Error(`Failed to list requirements: ${res.statusText}`);
    }
    return res.json() as Promise<RequirementDto[]>;
  }

  async getRequirement(projectId: string, requirementId: string): Promise<RequirementDto> {
    const res = await fetch(
      `${this.baseUrl}/api/v1/projects/${projectId}/requirements/${requirementId}`
    );
    if (!res.ok) {
      throw new Error(`Failed to get requirement: ${res.statusText}`);
    }
    return res.json() as Promise<RequirementDto>;
  }

  async getRequirementSimulations(projectId: string, requirementId: string): Promise<SimulationDto[]> {
    const res = await fetch(
      `${this.baseUrl}/api/v1/projects/${projectId}/requirements/${requirementId}/simulations`
    );
    if (!res.ok) {
      throw new Error(`Failed to get requirement simulations: ${res.statusText}`);
    }
    return res.json() as Promise<SimulationDto[]>;
  }
}
