const { requestPrivateApi: defaultRequestPrivateApi } = require('../clients/private-api');

class HealthService {
  async fetchPrivateApiHealth(requestPrivateApi = defaultRequestPrivateApi, apiPath = '/api/v1/healthz') {
    const startedAt = performance.now();
    const response = await requestPrivateApi(apiPath);
    return {
      apiUrl: response.url,
      checkedAt: new Date().toISOString(),
      latencyMs: Math.round(performance.now() - startedAt),
      ok: response.statusCode === 200 && response.data?.status === 'ok',
      payload: response.data,
      statusCode: response.statusCode,
    };
  }
}

module.exports = new HealthService();
