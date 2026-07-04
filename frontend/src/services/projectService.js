const { requestPrivateApi } = require('../clients/private-api');

class ProjectService {
  async createProject(name = '新しいプロジェクト') {
    try {
      const response = await requestPrivateApi('/api/v1/projects', {
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
      const response = await requestPrivateApi('/api/v1/projects');
      if (response.ok && Array.isArray(response.data)) {
        const apiProjects = response.data;
        return await Promise.all(
          apiProjects.map(async (apiProj) => {
            let personas = [];
            try {
              const personaResponse = await requestPrivateApi(
                `/api/v1/projects/${apiProj.id}/personas`,
              );
              if (personaResponse.ok && Array.isArray(personaResponse.data)) {
                personas = personaResponse.data;
              }
            } catch (err) {
              console.error(
                `Failed to fetch personas for project ${apiProj.id}`,
                err,
              );
            }
            return {
              id: apiProj.id,
              name: apiProj.name,
              isInitial: apiProj.chats && apiProj.chats.length > 0 ? false : true,
              personas: personas,
              chats: apiProj.chats || [],
              activeChatId: apiProj.activeChatId || null,
              createdAt: apiProj.createdAt,
              updatedAt: apiProj.updatedAt
            };
          }),
        );
      }
    } catch (err) {
      console.error('Failed to fetch projects', err);
    }
    return [];
  }

  async updateProjectName(id, name) {
    try {
      const response = await requestPrivateApi(`/api/v1/projects/${id}`, {
        method: 'PUT',
        body: { name }
      });
      return response.ok;
    } catch (err) {
      console.error('Failed to update project name', err);
      return false;
    }
  }

  async deleteProject(id) {
    try {
      const response = await requestPrivateApi(`/api/v1/projects/${id}`, {
        method: 'DELETE'
      });
      return response.ok;
    } catch (err) {
      console.error('Failed to delete project', err);
      return false;
    }
  }

  async getDashboardContext(activeProjectId, selectedPersonaId) {
    const projectsList = await this.fetchProjects();
    const activeProject =
      projectsList.find((candidate) => candidate.id === activeProjectId) ||
      projectsList[0];

    if (!activeProject) {
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

  getProjectState(activeProject) {
    if (!activeProject) {
      return {
        activeProjectId: null,
        isInitial: true,
        activeChatId: null
      };
    }
    return {
      activeProjectId: activeProject.id,
      isInitial: activeProject.isInitial,
      activeChatId: activeProject.activeChatId
    };
  }
}

module.exports = new ProjectService();
