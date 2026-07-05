import type { HttpClient } from './http-client.js';

export class HealthApiClient {
  constructor(private readonly httpClient: HttpClient) {}

  async checkHealth(): Promise<boolean> {
    try {
      const res = await this.httpClient.request<{ status: string }>(
        '/api/v1/healthz',
      );
      return res.status === 'ok';
    } catch (error) {
      console.error('Health check request failed:', error);
      return false;
    }
  }
}
