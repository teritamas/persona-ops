const personaService = require('../services/personaService');
const { simulationService } = require('../services/simulationService');

exports.getPersonaDetail = async (req, res) => {
  const personaId = req.params.id;
  const simulationId = req.query.simulationId;

  if (!req.activeProject) {
    return res.render('partials/persona-detail-empty');
  }

  const { p, selectedPersonaId } = personaService.getPersonaDetail(req.activeProject, personaId);

  if (!p) {
    return res.render('partials/persona-detail-empty');
  }

  res.cookie('selectedPersonaId', personaId);

  let selectedSimulation = null;
  let reaction = null;

  if (simulationId) {
    try {
      const dashboardContext = await simulationService.getDashboard(req.activeProject, simulationId);
      selectedSimulation = dashboardContext.selectedSimulation;
      if (selectedSimulation && selectedSimulation.reactions) {
        reaction = selectedSimulation.reactions.find(r => r.personaId === personaId);
      }
    } catch (err) {
      console.error('Failed to fetch simulation reaction for detail panel', err);
    }
  }

  res.render('partials/persona-detail-oob', {
    p,
    selectedPersonaId,
    reaction,
    selectedSimulation
  });
};

exports.closePersonaDetail = async (req, res) => {
  const { selectedPersonaId } = personaService.closePersonaDetail(req.activeProject);
  const simulationId = req.query.simulationId;

  res.clearCookie('selectedPersonaId');

  let selectedSimulation = null;
  if (simulationId && req.activeProject) {
    try {
      const dashboardContext = await simulationService.getDashboard(req.activeProject, simulationId);
      selectedSimulation = dashboardContext.selectedSimulation;
    } catch (err) {
      console.error('Failed to fetch simulation for closePersonaDetail', err);
    }
  }

  res.render('partials/persona-detail-closed', {
    selectedPersonaId,
    selectedSimulation
  });
};
