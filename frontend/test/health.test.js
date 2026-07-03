const assert = require('node:assert/strict');
const test = require('node:test');
const { handleHealthRequest } = require('../src/routes/health');

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

test('returns a successful JSON health response', async () => {
  const response = createResponse();

  await handleHealthRequest(createRequest(), response, async (path) => {
    assert.equal(path, '/healthz');

    return {
      data: { status: 'ok' },
      statusCode: 200,
      url: 'http://127.0.0.1:8080/healthz',
    };
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.status, 'ok');
  assert.equal(response.body.statusCode, 200);
});

test('returns 503 when the private API is unhealthy', async () => {
  const response = createResponse();

  await handleHealthRequest(createRequest(), response, async () => ({
    data: { status: 'error' },
    statusCode: 500,
    url: 'http://127.0.0.1:8080/healthz',
  }));

  assert.equal(response.statusCode, 503);
  assert.equal(response.body.status, 'error');
  assert.equal(response.body.statusCode, 500);
});

test('returns an HTMX fragment and preserves failure status', async () => {
  const response = createResponse();

  await handleHealthRequest(createRequest({ htmx: true }), response, async () => {
    throw new Error('Private API is unreachable.');
  });

  assert.equal(response.statusCode, 503);
  assert.match(response.body, /Unavailable/);
  assert.match(response.body, /Private API is unreachable/);
  assert.doesNotMatch(response.body, /<!DOCTYPE html>/);
});

test('escapes private API content rendered in an HTMX fragment', async () => {
  const response = createResponse();

  await handleHealthRequest(createRequest({ htmx: true }), response, async () => ({
    data: { message: '</pre><script>alert(1)</script>' },
    statusCode: 500,
    url: 'http://127.0.0.1:8080/healthz',
  }));

  assert.equal(response.statusCode, 503);
  assert.doesNotMatch(response.body, /<script>/);
  assert.match(response.body, /&lt;script&gt;/);
});
