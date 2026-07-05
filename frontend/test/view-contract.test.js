const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const ejs = require('ejs');

const viewsDirectory = path.join(__dirname, '..', 'src', 'views', 'partials');

test('ペルソナ位置保存URLにProject IDを含める', async () => {
  const html = await ejs.renderFile(
    path.join(viewsDirectory, 'sandbox-characters.ejs'),
    {
      activeProject: { id: 'project-1', personas: [] },
      requirements: [],
      selectedPersonaId: null,
      selectedSimulation: null,
      simulations: [],
    },
  );

  assert.match(
    html,
    /fetch\(`\/\$\{projectId\}\/action\/persona\/\$\{personaId\}\/position`/,
  );
});

test('シミュレーション再読込URLにProject IDを含める', async () => {
  const html = await ejs.renderFile(
    path.join(viewsDirectory, 'simulation-dashboard-error.ejs'),
    {
      activeProject: { id: 'project-1' },
      message: '取得に失敗しました',
    },
  );

  assert.match(html, /hx-get="\/project-1\/view\/simulations"/);
});
