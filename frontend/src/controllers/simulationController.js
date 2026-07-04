const { simulationService } = require('../services/simulationService');

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
    const context = await simulationService.getDashboard(req.activeProject, selectedSimulationId);
    const personaService = require('../services/personaService');
    
    personaService.closePersonaDetail(req.activeProject);
    res.clearCookie('selectedPersonaId');

    return res.render('partials/sandbox-characters-with-oob', {
      selectedSimulation: context.selectedSimulation,
    });
  } catch (error) {
    console.error('Failed to render simulation square', error);
    return res.status(500).send('Internal Server Error');
  }
};

exports.resetReactions = async (req, res) => {
  return res.render('partials/sandbox-characters-with-oob', {
    selectedSimulation: { status: 'running', reactions: [] },
  });
};
