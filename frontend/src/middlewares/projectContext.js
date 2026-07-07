const defaultProjectService = require('../services/projectService');
const sourceDocumentService = require('../services/sourceDocumentService');

function createProjectContext(projectService = defaultProjectService) {
  return async (req, res, next) => {
    try {
      const activeProjectId = req.params.projectId;
      let selectedPersonaId = req.cookies.selectedPersonaId;

      const context = await projectService.getDashboardContext(
        activeProjectId,
        selectedPersonaId,
      );

      if (selectedPersonaId && context.activeProject?.personas) {
        const hasPersona = context.activeProject.personas.some(
          (persona) => persona.id === selectedPersonaId,
        );
        if (!hasPersona) {
          res.clearCookie('selectedPersonaId', { path: '/' });
          selectedPersonaId = null;
          context.selectedPersonaId = null;
        }
      }

      req.activeProject = context.activeProject;
      req.projects = context.projects;
      req.activeProjectId = context.activeProjectId;
      req.selectedPersonaId = selectedPersonaId;

      res.locals.activeProject = context.activeProject;
      res.locals.projects = context.projects;
      res.locals.activeProjectId = context.activeProjectId;
      res.locals.selectedPersonaId = context.selectedPersonaId;

      if (context.activeProject && context.activeProject.id) {
        res.locals.sourceDocuments = await sourceDocumentService.fetchDocuments(context.activeProject.id);
      } else {
        res.locals.sourceDocuments = [];
      }


      next();
    } catch (error) {
      console.error('Failed to resolve project context in middleware', error);
      next(error);
    }
  };
}

module.exports = createProjectContext();
module.exports.createProjectContext = createProjectContext;
