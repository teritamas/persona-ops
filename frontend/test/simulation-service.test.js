const assert = require('node:assert/strict');
const test = require('node:test');

const {
  SimulationService,
  formatDateTime,
} = require('../src/services/simulationService');

const simulations = [
  {
    id: 'simulation-latest',
    status: 'completed',
    requirementSnapshot: {
      title: '最新要件',
      description: '最新要件の説明',
      acceptanceCriteria: ['確認できる'],
    },
    targetCount: 2,
    successCount: 2,
    failureCount: 0,
    summary: {
      averageValueScore: 4,
      averageAdoptionIntentScore: 4,
      averageWorkflowFitScore: 3,
      positiveCount: 2,
      neutralCount: 0,
      negativeCount: 0,
    },
    createdAt: '2026-07-04T10:00:00.000Z',
  },
  {
    id: 'simulation-past',
    status: 'failed',
    requirementSnapshot: {
      title: '過去要件',
      description: '過去要件の説明',
      acceptanceCriteria: [],
    },
    targetCount: 2,
    successCount: 0,
    failureCount: 2,
    summary: {
      averageValueScore: null,
      averageAdoptionIntentScore: null,
      averageWorkflowFitScore: null,
      positiveCount: 0,
      neutralCount: 0,
      negativeCount: 0,
    },
    createdAt: '2026-07-04T09:00:00.000Z',
  },
];

function createService(requestPrivateApiImplementation) {
  return new SimulationService({
    requestPrivateApiImplementation,
  });
}

const activeProject = {
  id: 'project-1',
  name: 'テストプロジェクト',
};

test('最新のシミュレーションと要件・Reactionを取得する', async () => {
  const requestedPaths = [];
  const service = createService(async (path) => {
    requestedPaths.push(path);
    if (path.endsWith('/simulations')) {
      return { ok: true, data: simulations };
    }
    return {
      ok: true,
      data: {
        ...simulations[0],
        reactions: [{ personaId: 'persona-1', status: 'completed' }],
      },
    };
  });

  const dashboard = await service.getDashboard(activeProject);

  assert.equal(dashboard.followLatest, true);
  assert.equal(dashboard.selectedSimulation.id, 'simulation-latest');
  assert.equal(
    dashboard.selectedSimulation.requirementSnapshot.title,
    '最新要件',
  );
  assert.equal(dashboard.selectedSimulation.reactions.length, 1);
  assert.equal(dashboard.selectedSimulation.label, '完了');
  assert.deepEqual(requestedPaths, [
    '/api/v1/projects/project-1/simulations',
    '/api/v1/projects/project-1/simulations/simulation-latest',
  ]);
});

test('過去のシミュレーションを選択した場合は選択結果を維持する', async () => {
  const service = createService(async (path) => {
    if (path.endsWith('/simulations')) {
      return { ok: true, data: simulations };
    }
    return {
      ok: true,
      data: { ...simulations[1], reactions: [] },
    };
  });

  const dashboard = await service.getDashboard(activeProject, 'simulation-past');

  assert.equal(dashboard.followLatest, false);
  assert.equal(dashboard.selectedSimulation.id, 'simulation-past');
  assert.equal(dashboard.selectedSimulation.label, '失敗');
});

test('履歴がない場合は詳細APIを呼ばず空の画面情報を返す', async () => {
  let requestCount = 0;
  const service = createService(async () => {
    requestCount += 1;
    return { ok: true, data: [] };
  });

  const dashboard = await service.getDashboard(activeProject);

  assert.equal(requestCount, 1);
  assert.equal(dashboard.selectedSimulation, null);
  assert.deepEqual(dashboard.simulations, []);
});

test('存在しない履歴IDとAPIエラーを表示用エラーへ変換する', async (t) => {
  await t.test('存在しない履歴IDを拒否する', async () => {
    const service = createService(async () => ({
      ok: true,
      data: simulations,
    }));

    await assert.rejects(
      service.getDashboard(activeProject, 'missing'),
      (error) =>
        error.code === 'NOT_FOUND' &&
        error.message.includes('見つかりません'),
    );
  });

  await t.test('一覧APIエラーを拒否する', async () => {
    const service = createService(async () => ({
      ok: false,
      data: { error: 'Internal Server Error' },
    }));

    await assert.rejects(service.getDashboard(activeProject), /履歴を取得できません/);
  });
});

test('日時がない場合や不正な場合はダッシュで表示する', () => {
  assert.equal(formatDateTime(), '—');
  assert.equal(formatDateTime('invalid'), '—');
  assert.notEqual(formatDateTime('2026-07-04T10:00:00.000Z'), '—');
});
