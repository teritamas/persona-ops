const { requestPrivateApi } = require('../clients/private-api');

class ProjectService {
  constructor(options = {}) {
    this.requestPrivateApi =
      options.requestPrivateApiImplementation ?? requestPrivateApi;
  }

  async createProject(name = '新しいプロジェクト') {
    try {
      const response = await this.requestPrivateApi('/api/v1/projects', {
        method: 'POST',
        body: { name }
      });

      if (response.ok && response.data) {
        return response.data;
      }
      return null;
    } catch (err) {
      console.error('Failed to create project via API', err);
      return null;
    }
  }

  async fetchProjects() {
    try {
      const response = await this.requestPrivateApi('/api/v1/projects');
      if (response.ok && Array.isArray(response.data)) {
        return response.data;
      }
    } catch (err) {
      console.error('Failed to fetch projects', err);
    }
    return [];
  }

  async updateProjectName(id, name) {
    try {
      const response = await this.requestPrivateApi(
        `/api/v1/projects/${encodeURIComponent(id)}`,
        {
          method: 'PUT',
          body: { name }
        },
      );
      return response.ok;
    } catch (err) {
      console.error('Failed to update project name', err);
      return false;
    }
  }

  async deleteProject(id) {
    try {
      const response = await this.requestPrivateApi(
        `/api/v1/projects/${encodeURIComponent(id)}`,
        { method: 'DELETE' },
      );
      return response.ok;
    } catch (err) {
      console.error('Failed to delete project', err);
      return false;
    }
  }

  async getDashboardContext(activeProjectId, selectedPersonaId) {
    const projectsList = await this.fetchProjects();
    const selectedProject =
      projectsList.find((candidate) => candidate.id === activeProjectId) ||
      projectsList[0];

    if (!selectedProject) {
      return {
        activeProject: {
          id: '',
          name: '',
          personas: [],
          chats: [],
          activeChatId: null,
          activeChat: { messages: [] },
          isInitial: true,
        },
        projects: [],
        activeProjectId: '',
        selectedPersonaId: null
      };
    }

    const projectId = encodeURIComponent(selectedProject.id);
    const [projectResponse, personaResponse] = await Promise.all([
      this.requestPrivateApi(`/api/v1/projects/${projectId}`),
      this.requestPrivateApi(`/api/v1/projects/${projectId}/personas`),
    ]);
    if (!projectResponse.ok || !projectResponse.data) {
      throw new Error('Failed to fetch the active project.');
    }

    const activeProject = {
      ...projectResponse.data,
      personas:
        personaResponse.ok && Array.isArray(personaResponse.data)
          ? personaResponse.data
          : [],
      chats: projectResponse.data.chats || [],
    };
    activeProject.activeChat =
      activeProject.chats.find((chat) => chat.id === activeProject.activeChatId) ||
      activeProject.chats[0] ||
      { messages: [] };
    activeProject.isInitial = activeProject.personas.length === 0;

    return {
      activeProject,
      projects: projectsList,
      activeProjectId: activeProject.id,
      selectedPersonaId: selectedPersonaId || null
    };
  }
}

module.exports = new ProjectService();
module.exports.ProjectService = ProjectService;
