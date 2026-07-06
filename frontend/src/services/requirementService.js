const { requestPrivateApi } = require('../clients/private-api');

class RequirementService {
  async fetchRequirements(projectId) {
    try {
      const response = await requestPrivateApi(
        `/api/v1/projects/${encodeURIComponent(projectId)}/requirements`,
      );
      if (response.ok && Array.isArray(response.data)) {
        return response.data;
      }
    } catch (err) {
      console.error(
        `Failed to fetch requirements for project ${projectId}`,
        err,
      );
    }
    return [];
  }

  async fetchRequirementById(projectId, requirementId) {
    try {
      const response = await requestPrivateApi(
        `/api/v1/projects/${encodeURIComponent(projectId)}/requirements/${encodeURIComponent(requirementId)}`,
      );
      if (response.ok && response.data) {
        return response.data;
      }
    } catch (err) {
      console.error(
        `Failed to fetch requirement ${requirementId} for project ${projectId}`,
        err,
      );
    }
    return null;
  }

  async saveRequirement(projectId, data) {
    try {
      const response = await requestPrivateApi(
        `/api/v1/projects/${encodeURIComponent(projectId)}/requirements`,
        {
          method: 'POST',
          body: data,
        },
      );
      if (response.ok && response.data) {
        return response.data;
      }
    } catch (err) {
      console.error(`Failed to save requirement for project ${projectId}`, err);
    }
    return null;
  }

  async deleteRequirement(projectId, requirementId) {
    try {
      const response = await requestPrivateApi(
        `/api/v1/projects/${encodeURIComponent(projectId)}/requirements/${encodeURIComponent(requirementId)}`,
        {
          method: 'DELETE',
        },
      );
      return response.ok || response.statusCode === 404;
    } catch (err) {
      console.error(`Failed to delete requirement ${requirementId} for project ${projectId}`, err);
      return false;
    }
  }

  async approveRequirement(projectId, requirementId) {
    try {
      const response = await requestPrivateApi(
        `/api/v1/projects/${encodeURIComponent(projectId)}/requirements/${encodeURIComponent(requirementId)}/approve`,
        {
          method: 'PATCH',
        },
      );
      if (response.ok && response.data) {
        return response.data;
      }
    } catch (err) {
      console.error(`Failed to approve requirement ${requirementId} for project ${projectId}`, err);
    }
    return null;
  }

  async fetchVersions(projectId, requirementId) {
    try {
      const response = await requestPrivateApi(
        `/api/v1/projects/${encodeURIComponent(projectId)}/requirements/${encodeURIComponent(requirementId)}/versions`,
      );
      if (response.ok && Array.isArray(response.data)) {
        return response.data;
      }
    } catch (err) {
      console.error(`Failed to fetch versions for requirement ${requirementId} in project ${projectId}`, err);
    }
    return [];
  }

  async restoreVersion(projectId, requirementId, version) {
    try {
      const response = await requestPrivateApi(
        `/api/v1/projects/${encodeURIComponent(projectId)}/requirements/${encodeURIComponent(requirementId)}/versions/${encodeURIComponent(version)}/restore`,
        {
          method: 'POST',
        },
      );
      if (response.ok && response.data) {
        return response.data;
      }
    } catch (err) {
      console.error(`Failed to restore version ${version} for requirement ${requirementId} in project ${projectId}`, err);
    }
    return null;
  }
}

module.exports = new RequirementService();
