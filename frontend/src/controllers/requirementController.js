const requirementService = require('../services/requirementService');

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
  res.render('partials/requirement-dashboard', {
    activeProject: req.activeProject,
    requirements,
    selectedRequirement,
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

  const requirementData = {
    title,
    description,
    acceptanceCriteria,
  };
  if (id && id.trim() !== '') {
    requirementData.id = id;
  }

  const saved = await requirementService.saveRequirement(
    req.activeProject.id,
    requirementData,
  );

  if (!saved) {
    return res.status(500).send('Failed to save requirement');
  }

  // 保存後はダッシュボード全体を再描画して一貫性を保つ
  const requirements = await requirementService.fetchRequirements(
    req.activeProject.id,
  );
  res.render('partials/requirement-dashboard', {
    activeProject: req.activeProject,
    requirements,
    selectedRequirement: saved,
  });
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
  // 削除後は残りの要件をロードしダッシュボード全体を再描画する
  const requirements = await requirementService.fetchRequirements(
    req.activeProject.id,
  );
  res.render('partials/requirement-dashboard', {
    activeProject: req.activeProject,
    requirements,
    selectedRequirement: requirements[0] || null,
  });
};
