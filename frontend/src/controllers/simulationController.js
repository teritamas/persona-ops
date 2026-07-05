const { simulationService } = require('../services/simulationService');
const requirementService = require('../services/requirementService');

const SIMULATION_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

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

exports.getSimulationDashboard = async (req, res) => {
  const selectedSimulationId = req.params.simulationId;
  if (
    selectedSimulationId &&
    !SIMULATION_ID_PATTERN.test(selectedSimulationId)
  ) {
    return res.status(400).render('partials/simulation-dashboard-error', {
      message: 'シミュレーションIDが不正です。',
    });
  }

  try {
    const hiddenSimulations = getHiddenSimulations(req);
    const context =
      await simulationService.getDashboard(req.activeProject, selectedSimulationId, hiddenSimulations);
    return res.render('partials/simulation-dashboard', context);
  } catch (error) {
    console.error('Failed to render simulation dashboard', error);
    const statusCode = error.code === 'NOT_FOUND' ? 404 : 502;
    return res.status(statusCode).render('partials/simulation-dashboard-error', {
      message: error.message,
    });
  }
};

exports.getSimulationSquare = async (req, res) => {
  const selectedSimulationId = req.query.simulationId;
  if (
    selectedSimulationId &&
    !SIMULATION_ID_PATTERN.test(selectedSimulationId)
  ) {
    return res.status(400).send('Invalid simulation ID');
  }

  try {
    const hiddenSimulations = getHiddenSimulations(req);
    const hiddenRequirements = getHiddenSandboxRequirements(req);
    const { selectedSimulation, simulations, requirements } = await simulationService.getSandboxContext(req.activeProject, selectedSimulationId, hiddenSimulations, hiddenRequirements);
    const selectedPersonaId = req.cookies.selectedPersonaId || null;

    return res.render('partials/sandbox-characters-with-oob', {
      activeProject: req.activeProject,
      selectedPersonaId,
      selectedSimulation,
      requirements,
      simulations,
    });
  } catch (error) {
    console.error('Failed to render simulation square', error);
    return res.status(500).send('Internal Server Error');
  }
};

exports.resetReactions = async (req, res) => {
  const requirements = await requirementService.fetchRequirements(req.activeProject.id);
  return res.render('partials/sandbox-characters-with-oob', {
    selectedSimulation: { status: 'running', reactions: [] },
    requirements,
    simulations: [],
  });
};

exports.hideSimulation = async (req, res) => {
  if (!req.activeProject) {
    return res.status(404).send('Project not found');
  }
  const { simulationId } = req.params;
  
  // Cookieに追加して非表示にする
  const hiddenSimulations = getHiddenSimulations(req);
  if (!hiddenSimulations.includes(simulationId)) {
    hiddenSimulations.push(simulationId);
    res.cookie('hidden_simulations', JSON.stringify(hiddenSimulations), { maxAge: 30 * 24 * 60 * 60 * 1000 });
  }

  // 再取得して再描画
  try {
    const context = await simulationService.getDashboard(req.activeProject, undefined, hiddenSimulations);
    return res.render('partials/simulation-dashboard', context);
  } catch (error) {
    console.error('Failed to reload dashboard after hide', error);
    return res.status(500).render('partials/simulation-dashboard-error', {
      message: 'シミュレーション一覧の再取得に失敗しました。',
    });
  }
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
    const { simulations, requirements } = await simulationService.getSandboxContext(req.activeProject, simulation.id, hiddenSimulations, hiddenRequirements);
    const selectedPersonaId = req.cookies.selectedPersonaId || null;

    return res.render('partials/sandbox-characters-with-oob', {
      activeProject: req.activeProject,
      selectedPersonaId,
      selectedSimulation: simulation,
      requirements,
      simulations,
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
    const { selectedSimulation, simulations, requirements } = await simulationService.getSandboxContext(req.activeProject, selectedSimulationId, hiddenSimulations, hiddenRequirements);
    const selectedPersonaId = req.cookies.selectedPersonaId || null;

    return res.render('partials/sandbox-characters', {
      activeProject: req.activeProject,
      selectedPersonaId,
      selectedSimulation,
      requirements,
      simulations,
    });
  } catch (error) {
    console.error('Failed to hide requirement from sandbox', error);
    return res.status(500).send('Internal Server Error');
  }
};
