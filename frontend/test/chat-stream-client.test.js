const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function createFakeTimers() {
  let currentTime = 0;
  let nextTimerId = 1;
  const timers = [];

  return {
    setTimeout(callback, delay = 0) {
      const id = nextTimerId;
      nextTimerId += 1;
      timers.push({
        id,
        runAt: currentTime + delay,
        callback,
      });
      return id;
    },
    flushAll() {
      while (timers.length > 0) {
        timers.sort((a, b) => a.runAt - b.runAt || a.id - b.id);
        const timer = timers.shift();
        currentTime = timer.runAt;
        timer.callback();
      }
    },
  };
}

function createElement(id, overrides = {}) {
  return {
    id,
    className: '',
    style: {},
    classList: {
      removed: [],
      remove(className) {
        this.removed.push(className);
      },
    },
    ...overrides,
  };
}

function loadChatStreamClient(elements = {}) {
  const timers = createFakeTimers();
  const ajaxCalls = [];
  const triggerCalls = [];
  const documentListeners = [];
  const context = {
    console,
    URLSearchParams,
    Date,
    setInterval() {
      return 1;
    },
    clearInterval() {},
    setTimeout: timers.setTimeout,
    window: {
      currentProjectId: 'project-1',
    },
    document: {
      cookie: '',
      addEventListener(eventName, callback) {
        documentListeners.push({ eventName, callback });
      },
      getElementById(id) {
        return elements[id] || null;
      },
      querySelectorAll() {
        return [];
      },
    },
    htmx: {
      ajax(method, requestPath, options) {
        ajaxCalls.push({ method, path: requestPath, options });
      },
      trigger(target, eventName, detail) {
        triggerCalls.push({ target, eventName, detail });
      },
    },
  };

  context.globalThis = context;
  vm.createContext(context);
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'public', 'js', 'chat-stream.js'),
    'utf8',
  );
  vm.runInContext(source, context, {
    filename: 'chat-stream.js',
  });

  return {
    context,
    timers,
    ajaxCalls,
    triggerCalls,
    documentListeners,
  };
}

function runSystemAction(tag, elements = {}) {
  const client = loadChatStreamClient(elements);
  const { actions } = client.context.parseAndCleanSystemActions(tag);
  assert.equal(actions.length, 1);

  actions[0].onDetect();
  client.timers.flushAll();

  return client;
}

test('ペルソナ保存完了タグはシミュレーション広場とサイドバーを更新する', () => {
  const sandbox = createElement('sandbox-characters');
  const playground = createElement('simulation-playground', {
    style: { display: 'none' },
  });
  const leftPanel = createElement('left-panel-content');

  const { ajaxCalls, triggerCalls, context } = runSystemAction(
    '[SYSTEM_ACTION: PERSONAS_SAVED]',
    {
      'sandbox-characters': sandbox,
      'simulation-playground': playground,
      'left-panel-content': leftPanel,
    },
  );

  assert.match(context.document.cookie, /selectedSimulationId=/);
  assert.equal(playground.style.display, 'flex');
  assert.equal(leftPanel.className.includes('w-[400px]'), true);
  assert.equal(
    ajaxCalls.some(
      (call) =>
        call.path.startsWith('/project-1/view/simulation-square?') &&
        call.options.target === '#sandbox-characters',
    ),
    true,
  );
  assert.equal(
    triggerCalls.some((call) => call.eventName === 'refreshSidebar'),
    true,
  );
});

test('要件保存完了タグはシミュレーション広場と要件表示を更新する', () => {
  const { ajaxCalls, triggerCalls } = runSystemAction(
    '[SYSTEM_ACTION: REQUIREMENT_SAVED]',
    {
      'sandbox-characters': createElement('sandbox-characters'),
      'simulation-playground': createElement('simulation-playground'),
      'left-panel-content': createElement('left-panel-content'),
      'requirement-notification-badge': createElement('requirement-notification-badge', {
        classList: {
          removed: [],
          remove(className) {
            this.removed.push(className);
          },
        },
      }),
    },
  );

  assert.equal(
    ajaxCalls.some((call) => call.options.target === '#sandbox-characters'),
    true,
  );
  assert.equal(
    triggerCalls.some((call) => call.eventName === 'refreshRequirementDashboard'),
    true,
  );
  assert.equal(
    triggerCalls.some((call) => call.eventName === 'refreshSidebar'),
    true,
  );
});

test('シミュレーション開始タグは最新シミュレーションを追従して広場を更新する', () => {
  const { ajaxCalls, triggerCalls } = runSystemAction(
    '[SYSTEM_ACTION: SIMULATION_REQUESTED]',
    {
      'sandbox-characters': createElement('sandbox-characters'),
      'simulation-playground': createElement('simulation-playground'),
      'left-panel-content': createElement('left-panel-content'),
    },
  );

  assert.equal(
    ajaxCalls.some(
      (call) =>
        call.options.target === '#sandbox-characters' &&
        call.path.includes('followLatest=1'),
    ),
    true,
  );
  assert.equal(
    triggerCalls.some((call) => call.eventName === 'refreshRequirementDashboard'),
    true,
  );
});

test('要件承認完了タグはシミュレーション広場と要件表示を更新する', () => {
  const { ajaxCalls, triggerCalls } = runSystemAction(
    '[SYSTEM_ACTION: REQUIREMENT_APPROVED]',
    {
      'sandbox-characters': createElement('sandbox-characters'),
    },
  );

  assert.equal(
    ajaxCalls.some((call) => call.options.target === '#sandbox-characters'),
    true,
  );
  assert.equal(
    triggerCalls.some((call) => call.eventName === 'refreshRequirementDashboard'),
    true,
  );
});
