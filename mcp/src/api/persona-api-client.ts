import type { HttpClient } from './http-client.js';

export interface PersonaDto {
  id: string;
  projectId: string;
  name: string;
  age: number;
  role: string;
  traits: string[];
  background: string;
  x: number;
  y: number;
}

export class PersonaApiClient {
  constructor(private readonly httpClient: HttpClient) {}

  async listPersonas(projectId: string): Promise<PersonaDto[]> {
    return this.httpClient.request<PersonaDto[]>(
      `/api/v1/projects/${projectId}/personas`,
    );
  }
}
