const { requestPrivateApi } = require('../clients/private-api');

exports.fetchDocuments = async (projectId) => {
  try {
    const response = await requestPrivateApi(
      `/api/v1/projects/${encodeURIComponent(projectId)}/source-documents`,
    );
    if (response.ok && response.data) {
      return response.data.documents || [];
    }
    return [];
  } catch (error) {
    console.error(`Error fetching source documents for project ${projectId}:`, error);
    return [];
  }
};
