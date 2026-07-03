const { GoogleAuth } = require('google-auth-library');

const AUTH_MODES = new Set(['google-id-token', 'none']);
const DEFAULT_API_BASE_URL = 'http://127.0.0.1:8080';
const DEFAULT_TIMEOUT_MS = 5000;

class PrivateApiError extends Error {
  constructor(message, options = {}) {
    super(message, { cause: options.cause });
    this.name = 'PrivateApiError';
    this.code = options.code ?? 'UNKNOWN';
  }
}

function resolveConfig(environment = process.env) {
  const authMode = environment.API_AUTH_MODE ?? 'none';
  const configuredBaseUrl = environment.API_BASE_URL ?? DEFAULT_API_BASE_URL;

  if (!AUTH_MODES.has(authMode)) {
    throw new PrivateApiError(`Unsupported API_AUTH_MODE: ${authMode}`, {
      code: 'CONFIGURATION',
    });
  }

  if (environment.NODE_ENV === 'production' && authMode !== 'google-id-token') {
    throw new PrivateApiError(
      'API_AUTH_MODE must be google-id-token when NODE_ENV is production.',
      { code: 'CONFIGURATION' },
    );
  }

  let baseUrl;

  try {
    baseUrl = new URL(configuredBaseUrl);
  } catch (error) {
    throw new PrivateApiError('API_BASE_URL must be a valid HTTP(S) URL.', {
      cause: error,
      code: 'CONFIGURATION',
    });
  }

  if (!['http:', 'https:'].includes(baseUrl.protocol)) {
    throw new PrivateApiError('API_BASE_URL must use HTTP or HTTPS.', {
      code: 'CONFIGURATION',
    });
  }

  return {
    authMode,
    baseUrl,
  };
}

function resolveRequestUrl(baseUrl, path) {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) {
    throw new PrivateApiError('Private API path must be a root-relative path.', {
      code: 'CONFIGURATION',
    });
  }

  const requestUrl = new URL(path, baseUrl);

  if (requestUrl.origin !== baseUrl.origin) {
    throw new PrivateApiError('Private API path must use the configured API origin.', {
      code: 'CONFIGURATION',
    });
  }

  return requestUrl;
}

function isJsonBody(body) {
  if (Array.isArray(body)) {
    return true;
  }

  if (body === null || typeof body !== 'object') {
    return false;
  }

  const prototype = Object.getPrototypeOf(body);
  return prototype === Object.prototype || prototype === null;
}

function createPrivateApiClient(options = {}) {
  const environment = options.environment ?? process.env;
  const fetchImplementation = options.fetchImplementation ?? globalThis.fetch;
  const defaultTimeoutMs = options.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS;
  const { authMode, baseUrl } = resolveConfig(environment);
  const googleAuth =
    options.googleAuth ?? (authMode === 'google-id-token' ? new GoogleAuth() : null);
  const idTokenClients = new Map();

  if (!Number.isFinite(defaultTimeoutMs) || defaultTimeoutMs <= 0) {
    throw new PrivateApiError('defaultTimeoutMs must be a positive number.', {
      code: 'CONFIGURATION',
    });
  }

  if (typeof fetchImplementation !== 'function') {
    throw new PrivateApiError('A fetch implementation is required.', {
      code: 'CONFIGURATION',
    });
  }

  async function getAuthenticationHeaders(requestUrl) {
    if (authMode === 'none') {
      return new Headers();
    }

    const audience = baseUrl.origin;

    try {
      if (!idTokenClients.has(audience)) {
        idTokenClients.set(audience, await googleAuth.getIdTokenClient(audience));
      }

      return await idTokenClients.get(audience).getRequestHeaders(requestUrl);
    } catch (error) {
      throw new PrivateApiError('Failed to obtain a Google ID token.', {
        cause: error,
        code: 'AUTHENTICATION',
      });
    }
  }

  async function request(path, requestOptions = {}) {
    const requestUrl = resolveRequestUrl(baseUrl, path);
    const timeoutMs = requestOptions.timeoutMs ?? defaultTimeoutMs;
    const headers = new Headers(requestOptions.headers);
    const authenticationHeaders = await getAuthenticationHeaders(requestUrl.toString());
    let body = requestOptions.body;

    for (const [name, value] of authenticationHeaders) {
      headers.set(name, value);
    }

    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
      throw new PrivateApiError('timeoutMs must be a positive number.', {
        code: 'CONFIGURATION',
      });
    }

    if (isJsonBody(body)) {
      body = JSON.stringify(body);

      if (!headers.has('content-type')) {
        headers.set('content-type', 'application/json');
      }
    }

    let response;

    try {
      response = await fetchImplementation(requestUrl, {
        body,
        headers,
        method: requestOptions.method ?? 'GET',
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      const timedOut = error?.name === 'TimeoutError' || error?.name === 'AbortError';

      throw new PrivateApiError(
        timedOut ? 'Private API request timed out.' : 'Private API is unreachable.',
        {
          cause: error,
          code: timedOut ? 'TIMEOUT' : 'NETWORK',
        },
      );
    }

    let data;

    try {
      data = await response.json();
    } catch (error) {
      throw new PrivateApiError('Private API returned a non-JSON response.', {
        cause: error,
        code: 'INVALID_RESPONSE',
      });
    }

    return {
      data,
      errorType:
        response.status === 401 || response.status === 403
          ? 'authentication'
          : response.ok
            ? null
            : 'upstream',
      ok: response.ok,
      statusCode: response.status,
      url: requestUrl.toString(),
    };
  }

  return {
    request,
  };
}

const privateApiClient = createPrivateApiClient();

module.exports = {
  PrivateApiError,
  createPrivateApiClient,
  requestPrivateApi: privateApiClient.request,
};
