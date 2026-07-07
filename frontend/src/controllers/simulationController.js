const { simulationService } = require('../services/simulationService');
const requirementService = require('../services/requirementService');

const SIMULATION_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const FOLLOW_LATEST_SIMULATION_VALUE = '1';

function getHiddenSimulations(req) {
  if (req.cookies && req.cookies.hidden_simulations) {
    try {
      return JSON.parse(req.cookies.hidden_simulations);
    } catch {
      return [];
    }
  }
  return [];
}

function getHiddenSandboxRequirements(req) {
  if (req.cookies && req.cookies.hidden_sandbox_requirements) {
    try {
      return JSON.parse(req.cookies.hidden_sandbox_requirements);
    } catch {
      return [];
    }
  }
  return [];
}

function resolveSelectedSimulationId(req) {
  if (req.query.followLatest === FOLLOW_LATEST_SIMULATION_VALUE) {
    return null;
  }

  const selectedSimulationId = req.query.simulationId;
  if (
    !selectedSimulationId ||
    selectedSimulationId === 'undefined' ||
    selectedSimulationId === 'dummy'
  ) {
    return req.cookies.selectedSimulationId || null;
  }

  return selectedSimulationId;
}

exports.resolveSelectedSimulationId = resolveSelectedSimulationId;

exports.getSimulationSquare = async (req, res) => {
  // クエリまたはクッキーから simulationId を解決
  const selectedSimulationId = resolveSelectedSimulationId(req);
  const targetRequirementId = req.query.requirementId;
  const targetVersion = req.query.version ? Number(req.query.version) : null;

  if (
    selectedSimulationId &&
    !SIMULATION_ID_PATTERN.test(selectedSimulationId)
  ) {
    return res.status(400).send('Invalid simulation ID');
  }
  if (
    targetRequirementId &&
    !SIMULATION_ID_PATTERN.test(targetRequirementId)
  ) {
    return res.status(400).send('Invalid requirement ID');
  }

  try {
    const hiddenSimulations = getHiddenSimulations(req);
    const hiddenRequirements = getHiddenSandboxRequirements(req);
    let {
      selectedSimulation,
      simulations,
      requirements,
      selectedRequirementId,
      selectedRequirementVersion,
    } = await simulationService.getSandboxContext(
      req.activeProject,
      selectedSimulationId,
      hiddenSimulations,
      hiddenRequirements,
      targetRequirementId,
      targetVersion
    );

    // データの変更検知 ＆ ロングポーリング保留ループ
    let currentStatus = selectedSimulation ? selectedSimulation.status : null;
    let currentReactionsCount = (selectedSimulation && selectedSimulation.reactions) ? selectedSimulation.reactions.length : 0;

    const isPollingState = selectedSimulation && ['running', 'queued'].includes(currentStatus);
    const lastStatus = req.query.lastStatus;
    const lastReactionsCount = req.query.lastReactionsCount !== undefined ? Number(req.query.lastReactionsCount) : null;

    if (isPollingState && lastStatus !== undefined && lastReactionsCount !== null) {
      /*
       * 【ロングポーリング (Long Polling) 処理】
       * クライアント主導の定期的な短期間ポーリングを削減し、サーバー側で進捗完了を非同期で保留待機します。
       * 
       * ■ リスクと将来の考慮事項:
       * 1. コネクション保留リスク: 
       *    同時アクセスが増大した場合、ExpressサーバーのTCPコネクション数とリソース（スレッド・メモリ）を
       *    一時的に消費し続けるリスクがあります。現状は少人数前提のため許容しますが、本番スケール時は注意が必要です。
       * 2. ネットワークプロキシのタイムアウト:
       *    プロキシ（ALBやNginx等）の無通信タイムアウトによる切断を避けるため、保留時間（TIMEOUT_MS）は
       *    インフラ設定値より短い時間（15秒）に制限しています。
       * 
       * ■ 案2 (将来的なSSE/WebSocket移行) への考慮:
       *    利用者が増えスケーラビリティが課題となる場合は、本ロングポーリング処理を廃止し、
       *    「Server-Sent Events (SSE) または WebSockets による完了イベントのプッシュ配信」へ移行し、
       *    イベント受信時にクライアントが1回だけ最新HTMLを取得する形（案2）に移行することを考慮してください。
       */
      const startTime = Date.now();
      const TIMEOUT_MS = 15000; // ロングポーリングの最大保留時間 (15秒)
      const POLL_INTERVAL_MS = 2000; // APIサーバーへの確認間隔 (2秒)

      let context = { selectedSimulation, simulations, requirements, selectedRequirementId, selectedRequirementVersion };

      // 変化がない間、ループして待機
      while (
        currentStatus === lastStatus &&
        currentReactionsCount === lastReactionsCount &&
        (Date.now() - startTime < TIMEOUT_MS)
      ) {
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));

        // 最新の状態を再取得
        const newContext = await simulationService.getSandboxContext(
          req.activeProject,
          selectedSimulationId,
          hiddenSimulations,
          hiddenRequirements,
          targetRequirementId,
          targetVersion
        );

        context = newContext;
        currentStatus = newContext.selectedSimulation ? newContext.selectedSimulation.status : null;
        currentReactionsCount = (newContext.selectedSimulation && newContext.selectedSimulation.reactions)
          ? newContext.selectedSimulation.reactions.length
          : 0;
      }

      // タイムアウト時に変化がなかった場合は 204 を返しつつ、次の接続を要求する
      if (
        currentStatus === lastStatus &&
        currentReactionsCount === lastReactionsCount
      ) {
        res.setHeader('HX-Trigger', 'refreshPoll');
        return res.status(204).end();
      }

      // 変化があった場合は最新コンテキストで描画データを上書き
      selectedSimulation = context.selectedSimulation;
      simulations = context.simulations;
      requirements = context.requirements;
      selectedRequirementId = context.selectedRequirementId;
      selectedRequirementVersion = context.selectedRequirementVersion;
    }

    const selectedPersonaId = req.cookies.selectedPersonaId || null;

    // 解決された最新のIDをクッキーに保存して同期
    if (selectedSimulation) {
      res.cookie('selectedSimulationId', selectedSimulation.id, { maxAge: 30 * 24 * 60 * 60 * 1000 });
    }

    return res.render('partials/sandbox-characters-with-oob', {
      activeProject: req.activeProject,
      selectedPersonaId,
      selectedSimulation,
      requirements,
      simulations,
      selectedRequirementId,
      selectedRequirementVersion,
    });
  } catch (error) {
    console.error('Failed to render simulation square', error);
    return res.status(500).send('Internal Server Error');
  }
};

exports.resetReactions = async (req, res) => {
  const requirements = await requirementService.fetchRequirements(req.activeProject.id);
  const requirementsWithVersions = await Promise.all(
    requirements.map(async (reqObj) => {
      const versions = await requirementService.fetchVersions(req.activeProject.id, reqObj.id);
      return { ...reqObj, versions: versions || [] };
    })
  );
  return res.render('partials/sandbox-characters-with-oob', {
    selectedSimulation: { id: 'dummy', status: 'running', reactions: [] },
    requirements: requirementsWithVersions,
    simulations: [],
    selectedRequirementId: null,
    selectedRequirementVersion: null,
  });
};



exports.runSimulation = async (req, res) => {
  if (!req.activeProject) {
    return res.status(404).send('Project not found');
  }
  const { requirementId } = req.body;
  if (!requirementId) {
    return res.status(400).send('requirementId is required');
  }

  try {
    const simulation = await simulationService.runSimulation(
      req.activeProject.id,
      requirementId
    );
    
    // 新しく実行したシミュレーションがもし非表示リストに入っていれば解除
    let hiddenSimulations = getHiddenSimulations(req);
    if (hiddenSimulations.includes(simulation.id)) {
       hiddenSimulations = hiddenSimulations.filter(id => id !== simulation.id);
       res.cookie('hidden_simulations', JSON.stringify(hiddenSimulations), { maxAge: 30 * 24 * 60 * 60 * 1000 });
    }

    // 新規シミュレーションIDを指定して箱庭のコンテキストを取得
    const hiddenRequirements = getHiddenSandboxRequirements(req);
    const {
      simulations,
      requirements,
      selectedRequirementId,
      selectedRequirementVersion,
    } = await simulationService.getSandboxContext(
      req.activeProject,
      simulation.id,
      hiddenSimulations,
      hiddenRequirements
    );
    const selectedPersonaId = req.cookies.selectedPersonaId || null;

    return res.render('partials/sandbox-characters-with-oob', {
      activeProject: req.activeProject,
      selectedPersonaId,
      selectedSimulation: simulation,
      requirements,
      simulations,
      selectedRequirementId,
      selectedRequirementVersion,
    });
  } catch (error) {
    console.error('Failed to run simulation', error);
    return res.status(500).send('Internal Server Error');
  }
};

exports.hideSandboxRequirement = async (req, res) => {
  if (!req.activeProject) {
    return res.status(404).send('Project not found');
  }
  const { requirementId } = req.params;
  
  const hiddenRequirements = getHiddenSandboxRequirements(req);
  if (!hiddenRequirements.includes(requirementId)) {
    hiddenRequirements.push(requirementId);
    res.cookie('hidden_sandbox_requirements', JSON.stringify(hiddenRequirements), { maxAge: 30 * 24 * 60 * 60 * 1000 });
  }

  try {
    const hiddenSimulations = getHiddenSimulations(req);
    const selectedSimulationId = req.query.simulationId;
    const {
      selectedSimulation,
      simulations,
      requirements,
      selectedRequirementId,
      selectedRequirementVersion,
    } = await simulationService.getSandboxContext(
      req.activeProject,
      selectedSimulationId,
      hiddenSimulations,
      hiddenRequirements
    );
    const selectedPersonaId = req.cookies.selectedPersonaId || null;

    return res.render('partials/sandbox-characters', {
      activeProject: req.activeProject,
      selectedPersonaId,
      selectedSimulation,
      requirements,
      simulations,
      selectedRequirementId,
      selectedRequirementVersion,
    });
  } catch (error) {
    console.error('Failed to hide requirement from sandbox', error);
    return res.status(500).send('Internal Server Error');
  }
};
