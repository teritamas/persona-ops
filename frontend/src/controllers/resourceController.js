const sourceDocumentService = require('../services/sourceDocumentService');

exports.getResourcesMenu = async (req, res) => {
  const activeProject = req.activeProject;
  let sourceDocuments = [];
  
  if (activeProject && activeProject.id) {
    sourceDocuments = await sourceDocumentService.fetchDocuments(activeProject.id);
  }

  res.render('partials/resources-menu', { sourceDocuments });
};
