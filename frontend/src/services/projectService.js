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
              personas: [
                { id: 'p1', name: '鈴木 健太', role: '現場セールス', x: 20, y: 30, avatarSeed: 'Felix', traits: ['効率重視', '外出多い'], reaction: null },
                { id: 'p2', name: '佐藤 真由美', role: 'マネージャー', x: 70, y: 40, avatarSeed: 'Aneka', traits: ['データ重視', '管理職'], reaction: null },
                { id: 'p3', name: '田中 宏', role: '内勤営業', x: 45, y: 60, avatarSeed: 'Jasper', traits: ['効率重視', 'PC作業中心'], reaction: null },
                { id: 'p4', name: '高橋 涼子', role: '営業企画', x: 80, y: 70, avatarSeed: 'Avery', traits: ['改善意欲', '分析好き'], reaction: null },
                { id: 'p5', name: '伊藤 健', role: '若手セールス', x: 30, y: 80, avatarSeed: 'Leo', traits: ['学習意欲', 'スマホ世代'], reaction: null }
              ],
              chats: apiProj.chats || [],
              activeChatId: apiProj.activeChatId || null
            });
          }
        });
        return apiProjects;
      }
    } catch (err) {
      console.error('Failed to fetch projects via API', err);
    }
    return [];
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
