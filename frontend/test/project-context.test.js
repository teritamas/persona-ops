const assert = require('node:assert/strict');
const test = require('node:test');

const {
  createProjectContext,
} = require('../src/middlewares/projectContext');

test('プロジェクトContextを1リクエストにつき1回だけ解決する', async () => {
  let calls = 0;
  const middleware = createProjectContext({
    async getDashboardContext(projectId, personaId) {
      calls += 1;
      assert.equal(projectId, 'project-1');
      assert.equal(personaId, 'persona-1');
      return {
        activeProject: {
          id: 'project-1',
          personas: [{ id: 'persona-1' }],
        },
        projects: [{ id: 'project-1' }],
        activeProjectId: 'project-1',
        selectedPersonaId: 'persona-1',
      };
    },
  });
  const request = {
    params: { projectId: 'project-1' },
    cookies: { selectedPersonaId: 'persona-1' },
  };
  const response = {
    locals: {},
    clearCookie() {
      throw new Error('Cookie should not be cleared.');
    },
  };
  let nextCalls = 0;

  await middleware(request, response, () => {
    nextCalls += 1;
  });

  assert.equal(calls, 1);
  assert.equal(nextCalls, 1);
  assert.equal(request.activeProject.id, 'project-1');
  assert.equal(response.locals.activeProjectId, 'project-1');
});

test('存在しない選択ペルソナのCookieを破棄する', async () => {
  const middleware = createProjectContext({
    async getDashboardContext() {
      return {
        activeProject: { id: 'project-1', personas: [] },
        projects: [],
        activeProjectId: 'project-1',
        selectedPersonaId: 'missing',
      };
    },
  });
  const request = {
    params: { projectId: 'project-1' },
    cookies: { selectedPersonaId: 'missing' },
  };
  let clearedCookie;
  const response = {
    locals: {},
    clearCookie(name) {
      clearedCookie = name;
    },
  };

  await middleware(request, response, () => undefined);

  assert.equal(clearedCookie, 'selectedPersonaId');
  assert.equal(response.locals.selectedPersonaId, null);
});
