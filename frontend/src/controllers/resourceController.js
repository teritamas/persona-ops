const { getActiveProject } = require('../services/dummy_data/store');
const sourceDocumentService = require('../services/sourceDocumentService');

exports.getResourcesMenu = async (req, res) => {
  const activeProject = getActiveProject();
  let sourceDocuments = [];
  
  if (activeProject && activeProject.id) {
    sourceDocuments = await sourceDocumentService.fetchDocuments(activeProject.id);
  }

  res.render('partials/resources-menu', { sourceDocuments });
};
