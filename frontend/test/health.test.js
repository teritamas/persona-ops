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


