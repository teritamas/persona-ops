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

  res.cookie('selectedPersonaId', personaId, { path: '/' });

  try {
    const { selectedSimulation, simulations, requirements } = await simulationService.getSandboxContext(req.activeProject, simulationId);
    const reaction = selectedSimulation?.reactions?.find(r => r.personaId === personaId) || null;

    res.render('partials/persona-detail-oob', {
      p,
      selectedPersonaId,
      reaction,
      selectedSimulation,
      requirements,
      simulations
    });
  } catch (err) {
    console.error('Failed to fetch sandbox context data for persona detail', err);
    res.status(500).send('Internal Server Error');
  }
};

exports.closePersonaDetail = async (req, res) => {
  const { selectedPersonaId } = personaService.closePersonaDetail(req.activeProject);
  const simulationId = req.query.simulationId;

  res.clearCookie('selectedPersonaId', { path: '/' });

  try {
    const { selectedSimulation, simulations, requirements } = await simulationService.getSandboxContext(req.activeProject, simulationId);

    res.render('partials/persona-detail-closed', {
      selectedPersonaId,
      selectedSimulation,
      requirements,
      simulations
    });
  } catch (err) {
    console.error('Failed to fetch sandbox context data for closePersonaDetail', err);
    res.status(500).send('Internal Server Error');
  }
};

exports.updatePersonaPosition = async (req, res) => {
  if (!req.activeProject) {
    return res.status(404).send('Project not found');
  }
  const personaId = req.params.id;
  const { x, y } = req.body;

  try {
    const updated = await personaService.updatePersonaPosition(
      req.activeProject.id,
      personaId,
      x,
      y
    );
    return res.json({ success: true, persona: updated });
  } catch (error) {
    console.error('Failed to update persona position', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
