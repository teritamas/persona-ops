const requirementService = require('../services/requirementService');
const { simulationService } = require('../services/simulationService');

function unhideSimulationsForRequirement(req, res, requirementId, simulations) {
  if (!requirementId || !simulations) return;
  if (!req.cookies) return;

  try {
    if (req.cookies.hidden_simulations) {
      let hiddenSimulations = JSON.parse(req.cookies.hidden_simulations);
      const relatedSimIds = simulations
        .filter(sim => sim.requirementId === requirementId)
        .map(sim => sim.id);

      const newHiddenSimulations = hiddenSimulations.filter(id => !relatedSimIds.includes(id));

      if (newHiddenSimulations.length !== hiddenSimulations.length) {
        res.cookie('hidden_simulations', JSON.stringify(newHiddenSimulations), { maxAge: 30 * 24 * 60 * 60 * 1000 });
      }
    }

    if (req.cookies.hidden_sandbox_requirements) {
      let hiddenReqs = JSON.parse(req.cookies.hidden_sandbox_requirements);
      const newHiddenReqs = hiddenReqs.filter(id => id !== requirementId);
      if (newHiddenReqs.length !== hiddenReqs.length) {
        res.cookie('hidden_sandbox_requirements', JSON.stringify(newHiddenReqs), { maxAge: 30 * 24 * 60 * 60 * 1000 });
      }
    }
  } catch {
    // Ignore JSON parse error
  }
}

exports.getRequirementsDashboard = async (req, res) => {
  if (!req.activeProject) {
    return res.status(404).send('Project not found');
  }
  const requirements = await requirementService.fetchRequirements(
    req.activeProject.id,
  );
  const { requirementId } = req.params;
  let selectedRequirement = null;
  if (requirements && requirements.length > 0) {
    selectedRequirement = requirements.find(r => r.id === requirementId) || requirements[0];
  }

  let versions = [];
  let isPastVersion = false;
  let latestRequirement = selectedRequirement;
  let selectedSimulation = null;

  if (selectedRequirement) {
    try {
      versions = await requirementService.fetchVersions(
        req.activeProject.id,
        selectedRequirement.id,
      );
      const queryVersion = req.query.version;
      if (queryVersion) {
        const ver = versions.find(v => v.version === Number(queryVersion));
        if (ver) {
          selectedRequirement = ver;
          isPastVersion = selectedRequirement.version !== latestRequirement.version;
        }
      }

      // 該当バージョンに対応するシミュレーション詳細をフェッチ
      selectedSimulation = await simulationService.getSimulationForRequirementVersion(
        req.activeProject.id,
        latestRequirement.id,
        selectedRequirement.version
      );

      const dashboard = await simulationService.getDashboard(req.activeProject);
      unhideSimulationsForRequirement(req, res, latestRequirement.id, dashboard.simulations);

      // If this is an HTMX request, trigger the sandbox to refresh so the unhidden requirement appears
      if (req.headers['hx-request']) {
        res.setHeader('HX-Trigger', 'refreshSandbox');
      }
    } catch (err) {
      console.error('Failed to process requirement versions or simulations:', err);
    }
  }

  res.render('partials/requirement-dashboard', {
    activeProject: req.activeProject,
    requirements,
    selectedRequirement,
    versions,
    isPastVersion,
    latestRequirement,
    selectedSimulation,
  });
};

exports.getRequirementEditForm = async (req, res) => {
  if (!req.activeProject) {
    return res.status(404).send('Project not found');
  }
  const { requirementId } = req.params;
  const requirement = await requirementService.fetchRequirementById(
    req.activeProject.id,
    requirementId,
  );
  if (!requirement) {
    return res.status(404).send('Requirement not found');
  }
  res.render('partials/requirement-edit-form', {
    activeProject: req.activeProject,
    requirement,
  });
};

exports.saveRequirement = async (req, res) => {
  if (!req.activeProject) {
    return res.status(404).send('Project not found');
  }
  const { id, title, description, acceptanceCriteriaText } = req.body;

  // 受入基準を行ごとに配列化
  const acceptanceCriteria = (acceptanceCriteriaText || '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const saved = await requirementService.saveRequirement(req.activeProject.id, {
    id,
    title,
    description,
    acceptanceCriteria,
  });

  if (!saved) {
    return res.status(500).send('Failed to save requirement');
  }

  if (req.headers['hx-request']) {
    res.setHeader('HX-Trigger', 'refreshSandbox, refreshSidebar');
    res.setHeader('HX-Push-Url', `/${req.activeProject.id}/requirements/${saved.id}`);
  }

  req.params.requirementId = saved.id;
  return exports.getRequirementsDashboard(req, res);
};

exports.createNewRequirementForm = (req, res) => {
  if (!req.activeProject) {
    return res.status(404).send('Project not found');
  }

  // 空のオブジェクトを渡して新規フォームを描画
  const emptyRequirement = {
    id: '',
    title: '',
    description: '',
    acceptanceCriteria: [],
  };

  res.render('partials/requirement-edit-form', {
    activeProject: req.activeProject,
    requirement: emptyRequirement,
    isNew: true,
  });
};

exports.deleteRequirement = async (req, res) => {
  if (!req.activeProject) {
    return res.status(404).send('Project not found');
  }
  const { requirementId } = req.params;
  const success = await requirementService.deleteRequirement(
    req.activeProject.id,
    requirementId,
  );
  if (!success) {
    return res.status(500).send('Failed to delete requirement');
  }

  const requirements = await requirementService.fetchRequirements(req.activeProject.id);
  const selectedReq = requirements[0] || null;

  if (req.headers['hx-request']) {
    res.setHeader('HX-Trigger', 'refreshSandbox, refreshSidebar');
    res.setHeader('HX-Push-Url', `/${req.activeProject.id}/requirements${selectedReq ? '/' + selectedReq.id : ''}`);
  }

  req.params.requirementId = selectedReq ? selectedReq.id : '';
  return exports.getRequirementsDashboard(req, res);
};

exports.approveRequirement = async (req, res) => {
  if (!req.activeProject) {
    return res.status(404).send('Project not found');
  }
  const { requirementId } = req.params;
  const approved = await requirementService.approveRequirement(
    req.activeProject.id,
    requirementId,
  );
  if (!approved) {
    return res.status(500).send('Failed to approve requirement');
  }

  try {
    const chatService = require('../services/chatService');
    const activeChat = req.activeProject.chats.find(c => c.id === req.activeProject.activeChatId);
    if (activeChat) {
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      await chatService.appendMessages(req.activeProject.id, activeChat.id, [{
        id: `msg_system_${Date.now()}`,
        role: 'system',
        text: '要件が承認されました。MCP経由で開発者が利用できるようになります。',
        time
      }]);
    }
  } catch (err) {
    console.error('Failed to append approval message to chat:', err);
  }

  if (req.headers['hx-request']) {
    res.setHeader('HX-Trigger', 'refreshSandbox, refreshChat');
  }

  req.params.requirementId = approved.id;
  return exports.getRequirementsDashboard(req, res);
};

exports.restoreRequirementVersion = async (req, res) => {
  if (!req.activeProject) {
    return res.status(404).send('Project not found');
  }
  const { requirementId, version } = req.params;
  const restored = await requirementService.restoreVersion(
    req.activeProject.id,
    requirementId,
    Number(version),
  );
  if (!restored) {
    return res.status(500).send('Failed to restore requirement version');
  }

  if (req.headers['hx-request']) {
    res.setHeader('HX-Trigger', 'refreshSandbox');
  }

  req.params.requirementId = restored.id;
  return exports.getRequirementsDashboard(req, res);
};

exports.runRequirementSimulation = async (req, res) => {
  if (!req.activeProject) {
    return res.status(404).send('Project not found');
  }
  const { requirementId } = req.params;
  try {
    const simulation = await simulationService.runSimulation(
      req.activeProject.id,
      requirementId
    );

    // シミュレーション開始通知をチャットへ追記
    try {
      const chatService = require('../services/chatService');
      const activeChat = req.activeProject.chats.find(c => c.id === req.activeProject.activeChatId);
      if (activeChat) {
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        await chatService.appendMessages(req.activeProject.id, activeChat.id, [{
          id: `msg_system_${Date.now()}`,
          role: 'system',
          text: 'シミュレーションの実行を開始しました。',
          time
        }]);
      }
    } catch (err) {
      console.error('Failed to append simulation start message to chat:', err);
    }

    unhideSimulationsForRequirement(req, res, requirementId, [simulation]);

    const requirements = await requirementService.fetchRequirements(req.activeProject.id);
    const selectedRequirement = requirements.find(r => r.id === requirementId) || requirements[0];
    const versions = await requirementService.fetchVersions(req.activeProject.id, selectedRequirement.id);

    if (req.headers['hx-request']) {
      res.setHeader('HX-Trigger', 'refreshSandbox, refreshChat');
    }

    return res.render('partials/requirement-dashboard', {
      activeProject: req.activeProject,
      requirements,
      selectedRequirement,
      versions,
      isPastVersion: false,
      latestRequirement: selectedRequirement,
      selectedSimulation: simulation,
    });
  } catch (error) {
    console.error('Failed to run simulation from requirement dashboard', error);
    return res.status(500).send('Internal Server Error');
  }
};
