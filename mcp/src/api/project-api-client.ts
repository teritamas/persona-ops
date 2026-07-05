import type { HttpClient } from './http-client.js';

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

export class ProjectApiClient {
  constructor(private readonly httpClient: HttpClient) {}

  async listProjects(): Promise<ProjectDto[]> {
    return this.httpClient.request<ProjectDto[]>('/api/v1/projects');
  }

  async listRequirements(projectId: string): Promise<RequirementDto[]> {
    return this.httpClient.request<RequirementDto[]>(
      `/api/v1/projects/${projectId}/requirements`,
    );
  }

  async getRequirement(
    projectId: string,
    requirementId: string,
  ): Promise<RequirementDto> {
    return this.httpClient.request<RequirementDto>(
      `/api/v1/projects/${projectId}/requirements/${requirementId}`,
    );
  }

  async getRequirementSimulations(
    projectId: string,
    requirementId: string,
  ): Promise<SimulationDto[]> {
    return this.httpClient.request<SimulationDto[]>(
      `/api/v1/projects/${projectId}/requirements/${requirementId}/simulations`,
    );
  }
}
