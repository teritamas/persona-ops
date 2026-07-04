const projectService = require('../services/projectService');
const { simulationService } = require('../services/simulationService');
const { marked } = require('marked');

exports.createProject = async (req, res) => {
  const newProject = await projectService.createProject();
  if (newProject) {
    res.cookie('activeProjectId', newProject.id);
  }
  res.set('HX-Redirect', '/');
  return res.send();
};

exports.switchProject = (req, res) => {
  res.cookie('activeProjectId', req.body.projectId);
  res.clearCookie('selectedPersonaId');
  res.set('HX-Redirect', '/');
  return res.send();
};

exports.getDashboard = async (req, res) => {
  let simulations = [];
  let selectedSimulation = null;
  
  if (req.activeProject && req.activeProject.id) {
    try {
      const simContext = await simulationService.getDashboard(req.activeProject, req.query.simulationId);
      simulations = simContext.simulations;
      selectedSimulation = simContext.selectedSimulation;
    } catch (err) {
      console.error('Failed to fetch simulations for dashboard', err);
    }
  }

  res.render('index', {
    simulations,
    selectedSimulation,
    isInitial: req.activeProject ? req.activeProject.isInitial : true,
    marked: marked.parse
  });
};

exports.getProjectState = (req, res) => {
  res.json(projectService.getProjectState(req.activeProject));
};

exports.renameProject = async (req, res) => {
  const { projectId, name } = req.body;
  if (projectId && name) {
    await projectService.updateProjectName(projectId, name);
  }
  res.redirect('/');
};

exports.deleteProject = async (req, res) => {
  const { projectId } = req.body;
  if (projectId) {
    await projectService.deleteProject(projectId);
    if (req.cookies.activeProjectId === projectId) {
      res.clearCookie('activeProjectId');
    }
  }
  res.redirect('/');
};
