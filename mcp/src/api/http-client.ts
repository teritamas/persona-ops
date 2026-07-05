import { GoogleAuth, type IdTokenClient } from 'google-auth-library';

export class HttpClient {
  private readonly googleAuth: GoogleAuth | null = null;
  private readonly idTokenClients = new Map<string, IdTokenClient>();

  constructor(
    private readonly baseUrl: string,
    private readonly authMode: 'google-id-token' | 'none' = 'none',
  ) {
    if (this.authMode === 'google-id-token') {
      this.googleAuth = new GoogleAuth();
    }
  }

  private async getHeaders(requestUrl: string): Promise<Headers> {
    const headers = new Headers();
    if (this.authMode === 'google-id-token' && this.googleAuth) {
      try {
        const urlObj = new URL(this.baseUrl);
        const audience = urlObj.origin;
        if (!this.idTokenClients.has(audience)) {
          this.idTokenClients.set(
            audience,
            await this.googleAuth.getIdTokenClient(audience),
          );
        }
        const client = this.idTokenClients.get(audience);
        if (client) {
          const authHeaders = await client.getRequestHeaders(requestUrl);
          // authHeaders can be a Headers instance or a plain object
          if (authHeaders instanceof Headers) {
            authHeaders.forEach((value, key) => {
              headers.set(key, value);
            });
          } else if (authHeaders) {
            for (const [key, value] of Object.entries(authHeaders)) {
              headers.set(key, value as string);
            }
          }
        }
      } catch (error) {
        throw new Error(
          `Failed to obtain a Google ID token: ${error instanceof Error ? error.message : String(error)}`,
          { cause: error },
        );
      }
    }
    return headers;
  }

  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers = await this.getHeaders(url);
    if (options.headers) {
      const optHeaders = new Headers(options.headers);
      optHeaders.forEach((value, key) => {
        headers.set(key, value);
      });
    }
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      throw new Error(
        `API Request failed on ${path}: ${res.statusText} (${res.status})`,
      );
    }
    return res.json() as Promise<T>;
  }
}
