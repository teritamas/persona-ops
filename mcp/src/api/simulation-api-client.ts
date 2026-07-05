import type { HttpClient } from './http-client.js';

export interface PersonaSnapshotDto {
  name: string;
}

export interface ReactionDto {
  personaSnapshot?: PersonaSnapshotDto;
  status: 'completed' | 'failed' | 'running' | 'queued';
  sentiment?: 'positive' | 'neutral' | 'negative';
  shortFeedback?: string;
  detailedFeedback?: string;
  concerns?: string[];
  errorMessage?: string;
  errorCode?: string;
}

export interface SimulationDto {
  id: string;
  projectId: string;
  requirementId: string;
  status: 'completed' | 'failed' | 'running' | 'queued';
  reactions: ReactionDto[];
  summary?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export class SimulationApiClient {
  constructor(private readonly httpClient: HttpClient) {}

  async requestSimulation(
    projectId: string,
    requirementId: string,
  ): Promise<SimulationDto> {
    return this.httpClient.request<SimulationDto>(
      `/api/v1/projects/${projectId}/simulations`,
      {
        method: 'POST',
        body: JSON.stringify({ requirementId }),
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  async getSimulation(
    projectId: string,
    simulationId: string,
  ): Promise<SimulationDto> {
    return this.httpClient.request<SimulationDto>(
      `/api/v1/projects/${projectId}/simulations/${simulationId}`,
    );
  }
}
