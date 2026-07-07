const assert = require('node:assert/strict');
const test = require('node:test');

const { resolveSelectedSimulationId } = require('../src/controllers/simulationController');

test('最新追従指定がある場合は古い選択Cookieを使わない', () => {
  const selectedSimulationId = resolveSelectedSimulationId({
    query: { followLatest: '1' },
    cookies: { selectedSimulationId: 'simulation-old' },
  });

  assert.equal(selectedSimulationId, null);
});

test('明示的な最新追従指定がない場合は選択Cookieを引き継ぐ', () => {
  const selectedSimulationId = resolveSelectedSimulationId({
    query: {},
    cookies: { selectedSimulationId: 'simulation-old' },
  });

  assert.equal(selectedSimulationId, 'simulation-old');
});
