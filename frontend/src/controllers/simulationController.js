const simulationService = require('../services/simulationService');

exports.getSuggestRes = (req, res) => {
  res.render('partials/suggest-input', {
    defaultValue: '先週実施したユーザーインタビューの議事録をアップロードします。これをもとにペルソナをアップデートしてください。'
  });
};

exports.getSuggestSim = (req, res) => {
  res.render('partials/suggest-input', {
    defaultValue: '新機能「SFAモバイル音声入力」の要件定義を行いたいです。シミュレーションをお願いします。'
  });
};

exports.resetReactions = (req, res) => {
  const { state, getActiveProject, initialPersonas } = require('../services/dummy_data/store');
  const activeProject = getActiveProject();
  
  // Create initial personas if they don't exist
  if (!activeProject.personas || activeProject.personas.length === 0) {
    activeProject.personas = JSON.parse(JSON.stringify(initialPersonas));
  }

  state.simulationDone = false;
  
  res.render('partials/sandbox-characters', {
    activeProject,
    simulationDone: false,
    selectedPersonaId: state.selectedPersonaId
  });
};

exports.simulateReactions = async (req, res) => {
  const activeProject = await simulationService.simulateReactions();
  res.render('partials/sandbox-characters', {
    activeProject,
    simulationDone: true,
    selectedPersonaId: null
  });
};
