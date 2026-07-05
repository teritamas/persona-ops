const assert = require('node:assert/strict');
const test = require('node:test');

const {
  ProjectService,
} = require('../src/services/projectService');

test('選択中プロジェクトだけの詳細とペルソナを取得する', async () => {
  const paths = [];
  const service = new ProjectService({
    requestPrivateApiImplementation: async (path) => {
      paths.push(path);
      if (path === '/api/v1/projects') {
        return {
          ok: true,
          data: [
            { id: 'project-1', name: 'One' },
            { id: 'project-2', name: 'Two' },
          ],
        };
      }
      if (path === '/api/v1/projects/project-2') {
        return {
          ok: true,
          data: {
            id: 'project-2',
            name: 'Two',
            chats: [{ id: 'chat-1', messages: [] }],
            activeChatId: 'chat-1',
          },
        };
      }
      if (path === '/api/v1/projects/project-2/personas') {
        return {
          ok: true,
          data: [{ id: 'persona-1', name: 'Persona' }],
        };
      }
      throw new Error(`Unexpected path: ${path}`);
    },
  });

  const context = await service.getDashboardContext('project-2', 'persona-1');

  assert.equal(context.activeProject.id, 'project-2');
  assert.equal(context.activeProject.personas.length, 1);
  assert.deepEqual(paths, [
    '/api/v1/projects',
    '/api/v1/projects/project-2',
    '/api/v1/projects/project-2/personas',
  ]);
});

test('プロジェクトがない場合は空の画面Contextを返す', async () => {
  const service = new ProjectService({
    requestPrivateApiImplementation: async () => ({ ok: true, data: [] }),
  });

  const context = await service.getDashboardContext();

  assert.equal(context.activeProject.id, '');
  assert.deepEqual(context.projects, []);
});
