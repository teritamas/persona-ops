const { requestPrivateApi } = require('../clients/private-api');
const { mockProjects, state } = require('./dummy_data/store');

class ProjectService {
  async createProject(name = '新しいプロジェクト') {
    try {
      const response = await requestPrivateApi('/api/v1/projects', {
        method: 'POST',
        body: { name }
      });

      if (response.ok && response.data) {
        const newProject = {
          id: response.data.id,
          name: response.data.name,
          isInitial: true,
          personas: [],
          chats: [],
          activeChatId: null
        };
        const existingIndex = mockProjects.findIndex(p => p.id === newProject.id);
        if (existingIndex === -1) {
          mockProjects.push(newProject);
        }
        state.activeProjectId = newProject.id;
        return newProject;
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

        await Promise.all(
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

            const mockProj = mockProjects.find((p) => p.id === apiProj.id);
            if (mockProj) {
              mockProj.name = apiProj.name;
              // APIから取得したペルソナをマージ（APIから取得できた場合はそれを正とする）
              if (personas.length > 0) {
                mockProj.personas = personas;
              }
            } else {
              mockProjects.push({
                id: apiProj.id,
                name: apiProj.name,
                personas: personas,
                chats: [],
                activeChatId: null,
              });
            }
          }),
        );
        return apiProjects;
      }
    } catch (err) {
      console.error('Failed to fetch projects via API', err);
    }
    return [];
  }
}

module.exports = new ProjectService();
