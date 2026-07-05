const express = require('express');
const {
  requestPrivateApi: defaultRequestPrivateApi,
} = require('../clients/private-api');
const healthService = require('../services/healthService');

const PUBLIC_HEALTH_PROXY_PATH = '/api/v1/healthz';
const PRIVATE_API_HEALTH_PATH = '/api/v1/healthz';

async function handleHealthRequest(req, res, requestPrivateApi) {
  try {
    const result = await healthService.fetchPrivateApiHealth(requestPrivateApi, PRIVATE_API_HEALTH_PATH);

    return res.status(result.ok ? 200 : 503).json({
      apiUrl: result.apiUrl,
      checkedAt: result.checkedAt,
      latencyMs: result.latencyMs,
      payload: result.payload,
      proxiedBy: 'persona-ops-web',
      status: result.ok ? 'ok' : 'error',
      statusCode: result.statusCode,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error while checking private API.';

    return res.status(503).json({
      checkedAt: new Date().toISOString(),
      details: message,
      proxiedBy: 'persona-ops-web',
      status: 'error',
    });
  }
}

function createHealthRouter(options = {}) {
  const router = express.Router();
  const requestPrivateApi = options.requestPrivateApi ?? defaultRequestPrivateApi;

  router.get(PUBLIC_HEALTH_PROXY_PATH, async (req, res) => {
    return handleHealthRequest(req, res, requestPrivateApi);
  });

  return router;
}

module.exports = createHealthRouter();
module.exports.createHealthRouter = createHealthRouter;
module.exports.handleHealthRequest = handleHealthRequest;
