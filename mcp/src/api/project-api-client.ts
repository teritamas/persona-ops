import type { HttpClient } from './http-client.js';

export interface ProjectDto {
  id: string;
  name: string;
}

export class ProjectApiClient {
  constructor(private readonly httpClient: HttpClient) {}

  async listProjects(): Promise<ProjectDto[]> {
    return this.httpClient.request<ProjectDto[]>('/api/v1/projects');
  }
}
