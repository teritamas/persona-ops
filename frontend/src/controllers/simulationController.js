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

exports.simulate = async (req, res) => {
  const text = req.body.inputText || '新機能のシミュレーション';
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const result = await simulationService.simulate(text, time);

  if (result.isInitial) {
    res.set('HX-Redirect', '/');
    return res.send();
  }

  const { activeProject, userMsg, agentMsg, selectedPersonaId, simulationDone } = result;

  res.render('partials/simulation-response-oob', {
    activeProject,
    userMsg,
    agentMsg,
    selectedPersonaId,
    simulationDone
  });
};
