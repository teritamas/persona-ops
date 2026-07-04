const { simulationService } = require('../services/simulationService');
const requirementService = require('../services/requirementService');

const SIMULATION_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

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
    const context =
      await simulationService.getDashboard(req.activeProject, selectedSimulationId);
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
    const { selectedSimulation, simulations, requirements } = await simulationService.getSandboxContext(req.activeProject, selectedSimulationId);
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

exports.deleteSimulation = async (req, res) => {
  if (!req.activeProject) {
    return res.status(404).send('Project not found');
  }
  const { simulationId } = req.params;
  const success = await simulationService.deleteSimulation(
    req.activeProject.id,
    simulationId,
  );
  if (!success) {
    return res.status(500).send('Failed to delete simulation');
  }

  // 再取得して再描画
  try {
    const context = await simulationService.getDashboard(req.activeProject, undefined);
    return res.render('partials/simulation-dashboard', context);
  } catch (error) {
    console.error('Failed to reload dashboard after delete', error);
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

    // 新規シミュレーションIDを指定して箱庭のコンテキストを取得
    const { simulations, requirements } = await simulationService.getSandboxContext(req.activeProject, simulation.id);
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
