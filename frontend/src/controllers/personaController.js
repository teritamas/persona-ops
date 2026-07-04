const personaService = require('../services/personaService');

exports.getPersonaDetail = (req, res) => {
  const { p, activeProject, simulationDone, selectedPersonaId } = personaService.getPersonaDetail(req.params.id);

  if (!p) {
    return res.render('partials/persona-detail-empty');
  }

  res.render('partials/persona-detail-oob', { p, activeProject, simulationDone, selectedPersonaId });
};

exports.closePersonaDetail = (req, res) => {
  const { activeProject, simulationDone, selectedPersonaId } = personaService.closePersonaDetail();
  res.render('partials/persona-detail-closed', { activeProject, simulationDone, selectedPersonaId });
};
