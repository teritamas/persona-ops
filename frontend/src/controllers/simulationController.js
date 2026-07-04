const simulationService = require('../services/simulationService');
const { renderSandbox, renderChatMessage } = require('../utils/renderers');

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

  const { activeProject, userMsg, agentMsg, selectedPersonaId } = result;

  const sandboxHtml = renderSandbox(true, activeProject, selectedPersonaId);
  const userMsgHtml = renderChatMessage(userMsg, activeProject);
  const agentMsgHtml = renderChatMessage(agentMsg, activeProject);

  let detailPanelOob = '';
  if (selectedPersonaId) {
    const p = activeProject.personas.find(persona => persona.id === selectedPersonaId);
    if (p) {
      res.render('partials/persona-detail', { p, simulationDone: true, updatedSandbox: '' }, (err, html) => {
        if (!err) {
          detailPanelOob = html;
        }
        sendSimulationResponse(res, sandboxHtml, userMsgHtml, agentMsgHtml, detailPanelOob);
      });
      return;
    }
  }
  
  sendSimulationResponse(res, sandboxHtml, userMsgHtml, agentMsgHtml, detailPanelOob);
};

function sendSimulationResponse(res, sandboxHtml, userMsgHtml, agentMsgHtml, detailPanelOob) {
  res.send(`
    ${sandboxHtml}
    <div id="chat-messages-container" hx-swap-oob="beforeend">
      ${userMsgHtml}
      ${agentMsgHtml}
    </div>
    <input 
      id="inputText"
      name="inputText"
      type="text" 
      value=""
      placeholder="新機能の仕様や質問を入力..."
      class="w-full bg-slate-100 text-slate-800 text-sm rounded-2xl py-4 pl-14 pr-14 border border-transparent focus:outline-none focus:border-orange-200 focus:bg-white focus:ring-4 focus:ring-orange-500/10 transition-all"
      required
      hx-swap-oob="true"
    />
    <div id="reception-rate-badge" hx-swap-oob="true" class="flex items-center gap-3 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm animate-fade-in">
      <span class="text-xs font-bold text-slate-500">全体受容度:</span>
      <span class="text-sm font-extrabold text-slate-800">72%</span>
      <span class="text-[10px] font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded">Good</span>
    </div>
    ${detailPanelOob}
  `);
}
