const assert = require('node:assert/strict');
const test = require('node:test');
const {
  createHealthRouter,
  handleHealthRequest,
} = require('../src/routes/health');

function createRequest({ htmx = false } = {}) {
  return {
    get(name) {
      return name === 'HX-Request' && htmx ? 'true' : undefined;
    },
  };
}

function createResponse() {
  return {
    body: undefined,
    statusCode: 200,
    json(body) {
      this.body = body;
      return this;
    },
    send(body) {
      this.body = body;
      return this;
    },
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
  };
}

test('private API が正常なときは成功の JSON ヘルスレスポンスを返す', async () => {
  const response = createResponse();

  await handleHealthRequest(createRequest(), response, async (path) => {
    assert.equal(path, '/api/v1/healthz');

    return {
      data: { status: 'ok' },
      statusCode: 200,
      url: 'http://127.0.0.1:8080/api/v1/healthz',
    };
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.status, 'ok');
  assert.equal(response.body.statusCode, 200);
});

test('private API が異常なときは 503 を返す', async () => {
  const response = createResponse();

  await handleHealthRequest(createRequest(), response, async () => ({
    data: { status: 'error' },
    statusCode: 500,
    url: 'http://127.0.0.1:8080/api/v1/healthz',
  }));

  assert.equal(response.statusCode, 503);
  assert.equal(response.body.status, 'error');
  assert.equal(response.body.statusCode, 500);
});

test('HTMX リクエストでは失敗時もステータスを維持した断片 HTML を返す', async () => {
  const response = createResponse();

  await handleHealthRequest(createRequest({ htmx: true }), response, async () => {
    throw new Error('Private API is unreachable.');
  });

  assert.equal(response.statusCode, 503);
  assert.match(response.body, /Unavailable/);
  assert.match(response.body, /Private API is unreachable/);
  assert.doesNotMatch(response.body, /<!DOCTYPE html>/);
});

test('HTMX 断片に埋め込む private API の内容をエスケープする', async () => {
  const response = createResponse();

  await handleHealthRequest(createRequest({ htmx: true }), response, async () => ({
    data: { message: '</pre><script>alert(1)</script>' },
    statusCode: 500,
    url: 'http://127.0.0.1:8080/api/v1/healthz',
  }));

  assert.equal(response.statusCode, 503);
  assert.doesNotMatch(response.body, /<script>/);
  assert.match(response.body, /&lt;script&gt;/);
});

test('公開ヘルスチェック画面は api/v1/healthz を HTMX の取得先として使う', () => {
  const router = createHealthRouter({
    requestPrivateApi: async () => ({
      data: { status: 'ok' },
      statusCode: 200,
      url: 'http://127.0.0.1:8080/api/v1/healthz',
    }),
  });
  const healthRouteLayer = router.stack.find(
    (layer) => layer.route?.path === '/ops/health',
  );
  const response = createResponse();

  healthRouteLayer.route.stack[0].handle({}, response);

  assert.match(response.body, /hx-get="\/api\/v1\/healthz"/);
  assert.doesNotMatch(response.body, /hx-get="\/healthz"/);
});
