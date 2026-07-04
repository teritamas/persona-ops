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
        apiProjects.forEach(apiProj => {
          const mockProj = mockProjects.find(p => p.id === apiProj.id);
          if (mockProj) {
            mockProj.name = apiProj.name;
            if (apiProj.chats !== undefined) mockProj.chats = apiProj.chats;
            if (apiProj.activeChatId !== undefined) mockProj.activeChatId = apiProj.activeChatId;
            if (mockProj.chats && mockProj.chats.length > 0) {
              mockProj.isInitial = false;
            }
          } else {
            mockProjects.push({
              id: apiProj.id,
              name: apiProj.name,
              isInitial: apiProj.chats && apiProj.chats.length > 0 ? false : true,
              personas: [],
              chats: apiProj.chats || [],
              activeChatId: apiProj.activeChatId || null
            });
          }
        });

        // Remove local mockProjects that don't exist in API anymore
        for (let i = mockProjects.length - 1; i >= 0; i--) {
          if (!apiProjects.find(ap => ap.id === mockProjects[i].id)) {
            mockProjects.splice(i, 1);
          }
        }
        return apiProjects;
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
      if (response.ok) {
        const mockProj = mockProjects.find(p => p.id === id);
        if (mockProj) {
          mockProj.name = name;
        }
        return true;
      }
      return false;
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
      if (response.ok) {
        const idx = mockProjects.findIndex(p => p.id === id);
        if (idx !== -1) {
          mockProjects.splice(idx, 1);
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to delete project', err);
      return false;
    }
  }

  async syncProject(project) {
    try {
      await requestPrivateApi(`/api/v1/projects/${project.id}`, {
        method: 'PUT',
        body: {
          name: project.name,
          chats: project.chats,
          activeChatId: project.activeChatId
        }
      });
    } catch (err) {
      console.error('Failed to sync project via API', err);
    }
  }
}

module.exports = new ProjectService();
