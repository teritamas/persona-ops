const assert = require('node:assert/strict');
const test = require('node:test');
const {
  PrivateApiError,
  createPrivateApiClient,
} = require('../src/clients/private-api');

function jsonResponse(data, options = {}) {
  return new Response(JSON.stringify(data), {
    headers: { 'content-type': 'application/json' },
    status: options.status ?? 200,
  });
}

test('none モードでは Google Auth を使わずにリクエストを送信する', async () => {
  let requestedUrl;
  let requestedOptions;
  let authenticationCalls = 0;
  const client = createPrivateApiClient({
    environment: {
      API_AUTH_MODE: 'none',
      API_BASE_URL: 'http://127.0.0.1:8080',
      NODE_ENV: 'development',
    },
    fetchImplementation: async (url, options) => {
      requestedUrl = url.toString();
      requestedOptions = options;
      return jsonResponse({ status: 'ok' });
    },
    googleAuth: {
      getIdTokenClient: async () => {
        authenticationCalls += 1;
      },
    },
  });

  const result = await client.request('/projects?limit=1', {
    body: { name: 'PersonaOps' },
    headers: { 'x-request-id': 'request-1' },
    method: 'POST',
  });

  assert.equal(authenticationCalls, 0);
  assert.equal(requestedUrl, 'http://127.0.0.1:8080/projects?limit=1');
  assert.equal(requestedOptions.method, 'POST');
  assert.equal(requestedOptions.body, JSON.stringify({ name: 'PersonaOps' }));
  assert.equal(requestedOptions.headers.get('content-type'), 'application/json');
  assert.equal(requestedOptions.headers.get('x-request-id'), 'request-1');
  assert.deepEqual(result.data, { status: 'ok' });
});

test('google-id-token モードでは認証ヘッダを付与しつつクライアントを再利用する', async () => {
  let clientCreationCalls = 0;
  const authorizationHeaders = [];
  const client = createPrivateApiClient({
    environment: {
      API_AUTH_MODE: 'google-id-token',
      API_BASE_URL: 'https://private-api.example.test',
      NODE_ENV: 'production',
    },
    fetchImplementation: async (url, options) => {
      authorizationHeaders.push(options.headers.get('authorization'));
      return jsonResponse({ url: url.toString() });
    },
    googleAuth: {
      getIdTokenClient: async (audience) => {
        clientCreationCalls += 1;
        assert.equal(audience, 'https://private-api.example.test');

        return {
          getRequestHeaders: async () =>
            new Headers({ authorization: 'Bearer signed-id-token' }),
        };
      },
    },
  });

  await client.request('/healthz');
  await client.request('/projects');

  assert.equal(clientCreationCalls, 1);
  assert.deepEqual(authorizationHeaders, [
    'Bearer signed-id-token',
    'Bearer signed-id-token',
  ]);
});

test('Google ID token の取得失敗を認証エラーとして扱う', async () => {
  const client = createPrivateApiClient({
    environment: {
      API_AUTH_MODE: 'google-id-token',
      API_BASE_URL: 'https://private-api.example.test',
      NODE_ENV: 'production',
    },
    fetchImplementation: async () => jsonResponse({ status: 'ok' }),
    googleAuth: {
      getIdTokenClient: async () => {
        throw new Error('metadata server unavailable');
      },
    },
  });

  await assert.rejects(client.request('/healthz'), {
    code: 'AUTHENTICATION',
    name: 'PrivateApiError',
  });
});

test('認証エラーと upstream エラーを HTTP ステータスで分類する', async () => {
  const statuses = [401, 500];
  const client = createPrivateApiClient({
    environment: {},
    fetchImplementation: async () =>
      jsonResponse({ status: 'error' }, { status: statuses.shift() }),
  });

  const authenticationFailure = await client.request('/healthz');
  const upstreamFailure = await client.request('/healthz');

  assert.equal(authenticationFailure.errorType, 'authentication');
  assert.equal(upstreamFailure.errorType, 'upstream');
});

test('204 No Contentを正常な空レスポンスとして扱う', async () => {
  const client = createPrivateApiClient({
    environment: {},
    fetchImplementation: async () => new Response(null, { status: 204 }),
  });

  const response = await client.request('/projects/project-1', {
    method: 'DELETE',
  });

  assert.equal(response.ok, true);
  assert.equal(response.data, null);
});

test('タイムアウト、ネットワーク、無効レスポンスを識別して扱う', async (t) => {
  await t.test('タイムアウトを検出する', async () => {
    const client = createPrivateApiClient({
      defaultTimeoutMs: 1,
      environment: {},
      fetchImplementation: async (_url, options) =>
        new Promise((resolve, reject) => {
          if (options.signal?.aborted) {
            return reject(options.signal.reason);
          }
          const onAbort = () => {
            clearTimeout(timer);
            reject(options.signal.reason);
          };
          options.signal?.addEventListener('abort', onAbort);
          const timer = setTimeout(() => {
            options.signal?.removeEventListener('abort', onAbort);
            resolve(new Response('{}'));
          }, 100);
        }),
    });

    await assert.rejects(client.request('/healthz'), {
      code: 'TIMEOUT',
      name: 'PrivateApiError',
    });
  });

  await t.test('ネットワーク障害を検出する', async () => {
    const client = createPrivateApiClient({
      environment: {},
      fetchImplementation: async () => {
        throw new TypeError('connection refused');
      },
    });

    await assert.rejects(client.request('/healthz'), {
      code: 'NETWORK',
      name: 'PrivateApiError',
    });
  });

  await t.test('JSON ではないレスポンスを拒否する', async () => {
    const client = createPrivateApiClient({
      environment: {},
      fetchImplementation: async () => new Response('not json'),
    });

    await assert.rejects(client.request('/healthz'), {
      code: 'INVALID_RESPONSE',
      name: 'PrivateApiError',
    });
  });
});

test('危険または不正な設定値を拒否する', async (t) => {
  const invalidConfigurations = [
    {
      environment: { API_AUTH_MODE: 'unknown' },
      message: 'Unsupported API_AUTH_MODE',
      title: '未対応の API_AUTH_MODE を拒否する',
    },
    {
      environment: { API_BASE_URL: 'not-a-url' },
      message: 'API_BASE_URL must be a valid HTTP(S) URL',
      title: '不正な API_BASE_URL を拒否する',
    },
    {
      environment: { API_BASE_URL: 'file:///tmp/api' },
      message: 'API_BASE_URL must use HTTP or HTTPS',
      title: 'HTTP(S) 以外の API_BASE_URL を拒否する',
    },
    {
      environment: { API_AUTH_MODE: 'none', NODE_ENV: 'production' },
      message: 'API_AUTH_MODE must be google-id-token',
      title: 'production で none 認証を拒否する',
    },
  ];

  for (const { environment, message, title } of invalidConfigurations) {
    await t.test(title, () => {
      assert.throws(
        () => createPrivateApiClient({ environment }),
        (error) =>
          error instanceof PrivateApiError &&
          error.code === 'CONFIGURATION' &&
          error.message.includes(message),
      );
    });
  }

  const client = createPrivateApiClient({
    environment: {},
    fetchImplementation: async () => jsonResponse({ status: 'ok' }),
  });

  await assert.rejects(client.request('https://example.test/healthz'), {
    code: 'CONFIGURATION',
  });
  await assert.rejects(client.request('//example.test/healthz'), {
    code: 'CONFIGURATION',
  });
  await assert.rejects(client.request('/healthz', { timeoutMs: 0 }), {
    code: 'CONFIGURATION',
  });
});
