const projectService = require('../services/projectService');
const { simulationService } = require('../services/simulationService');
const requirementService = require('../services/requirementService');
const { marked } = require('marked');

exports.getWelcomePage = async (req, res) => {
  const projects = await projectService.fetchProjects();
  res.render('welcome', {
    projects,
    activeProject: {
      id: '',
      name: '新しいプロジェクト',
      personas: [],
      chats: [],
      activeChatId: null,
      activeChat: { messages: [] },
      isInitial: true
    },
    activeProjectId: '',
    isInitial: true
  });
};

exports.createProject = async (req, res) => {
  const newProject = await projectService.createProject();
  if (newProject) {
    res.set('HX-Redirect', `/${newProject.id}`);
  } else {
    res.set('HX-Redirect', '/');
  }
  return res.send();
};

exports.getDashboard = async (req, res) => {
  let simulations = [];
  let selectedSimulation = null;
  let requirements = [];
  
  let activeTab = 'chat';
  let targetRequirementId = req.params.requirementId || null;
  
  const currentPath = req.path;
  let leftPanelUrl = `/${req.activeProject.id}/view/chat`;

  if (currentPath.startsWith('/resource')) {
    activeTab = 'resource';
    leftPanelUrl = `/${req.activeProject.id}/view/resources`;
  } else if (currentPath.startsWith('/requirements')) {
    activeTab = 'requirements';
    if (currentPath.endsWith('/edit')) {
      if (targetRequirementId) {
        leftPanelUrl = `/${req.activeProject.id}/view/requirements/${targetRequirementId}/edit`;
      } else {
        leftPanelUrl = `/${req.activeProject.id}/view/requirements/new-form`;
      }
    } else if (targetRequirementId) {
      leftPanelUrl = `/${req.activeProject.id}/view/requirements/${targetRequirementId}`;
    } else {
      leftPanelUrl = `/${req.activeProject.id}/view/requirements`;
    }
  }

  if (req.activeProject && req.activeProject.id) {
    try {
      const simContext = await simulationService.getDashboard(req.activeProject, req.query.simulationId);
      simulations = simContext.simulations;
      selectedSimulation = simContext.selectedSimulation;
      requirements = await requirementService.fetchRequirements(req.activeProject.id);
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
    }
  }

  res.render('index', {
    activeTab,
    leftPanelUrl,
    simulations,
    selectedSimulation,
    requirements,
    isInitial: req.activeProject ? req.activeProject.isInitial : true,
    marked: marked.parse
  });
};

exports.renameProject = async (req, res) => {
  const { projectId, name } = req.body;
  if (projectId && name) {
    await projectService.updateProjectName(projectId, name);
  }
  res.redirect(`/${projectId}`);
};

exports.deleteProject = async (req, res) => {
  const { projectId } = req.body;
  if (projectId) {
    const success = await projectService.deleteProject(projectId);
    if (!success) {
      return res.status(500).send('Failed to delete project');
    }
  }
  res.redirect('/');
};

exports.getTopNav = (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.render('partials/topnav');
};

exports.getSidebar = async (req, res) => {
  if (!req.activeProject) {
    return res.status(404).send('Project not found');
  }
  
  let requirements = [];
  try {
    requirements = await requirementService.fetchRequirements(req.activeProject.id);
  } catch (err) {
    console.error('Failed to fetch requirements for sidebar', err);
  }

  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.render('partials/sidebar', {
    activeProject: req.activeProject,
    requirements,
  });
};
