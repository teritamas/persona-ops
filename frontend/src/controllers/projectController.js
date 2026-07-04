const projectService = require('../services/projectService');
const { state, mockProjects, getActiveProject } = require('../services/dummy_data/store');

exports.createProject = async (req, res) => {
  await projectService.createProject();
  state.simulationDone = false;
  state.selectedPersonaId = null;
  res.set('HX-Redirect', '/');
  return res.send();
};

exports.switchProject = (req, res) => {
  state.activeProjectId = req.body.projectId;
  state.simulationDone = false;
  state.selectedPersonaId = null;
  res.set('HX-Redirect', '/');
  return res.send();
};

exports.getDashboard = async (req, res) => {
  await projectService.fetchProjects();

  // もし activeProjectId が存在しないIDを指していたらリセット
  if (!mockProjects.find(p => p.id === state.activeProjectId) && mockProjects.length > 0) {
    state.activeProjectId = mockProjects[0].id;
  }

  const activeProject = getActiveProject();
  res.render('index', {
    activeProject,
    mockProjects,
    activeProjectId: state.activeProjectId,
    isInitial: activeProject.isInitial,
    selectedPersonaId: state.selectedPersonaId
  });
};

exports.getProjectState = (req, res) => {
  const activeProject = getActiveProject();
  res.json({
    activeProjectId: activeProject.id,
    isInitial: activeProject.isInitial,
    activeChatId: activeProject.activeChatId
  });
};
