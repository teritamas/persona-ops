const personaService = require('../services/personaService');
const { renderSandbox } = require('../utils/renderers');

exports.getPersonaDetail = (req, res) => {
  const { p, activeProject, simulationDone, selectedPersonaId } = personaService.getPersonaDetail(req.params.id);

  if (!p) {
    return res.render('partials/persona-detail-empty');
  }

  const updatedSandbox = renderSandbox(simulationDone, activeProject, selectedPersonaId);

  res.render('partials/persona-detail', {
    p,
    simulationDone,
    updatedSandbox
  }, (err, html) => {
    if (err) return res.status(500).send(err.toString());
    res.send(`
      ${html}
      <div id="sandbox-characters" hx-swap-oob="innerHTML">
        ${updatedSandbox}
      </div>
    `);
  });
};

exports.closePersonaDetail = (req, res) => {
  const { activeProject, simulationDone, selectedPersonaId } = personaService.closePersonaDetail();
  const updatedSandbox = renderSandbox(simulationDone, activeProject, selectedPersonaId);
  
  res.send(`
    <aside id="detail-panel" class="w-[360px] bg-white border-l border-slate-200 z-30 flex flex-col shrink-0 overflow-y-auto" style="display: none;">
    </aside>

    <!-- OOB Update sandbox to remove selected border -->
    <div id="sandbox-characters" hx-swap-oob="innerHTML">
      ${updatedSandbox}
    </div>
  `);
};
