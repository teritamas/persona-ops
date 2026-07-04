const projectService = require('../services/projectService');

module.exports = async (req, res, next) => {
  // パスが /healthz などヘルスチェック関連の場合はコンテキスト処理をスキップ
  if (req.path.startsWith('/health') || req.path.startsWith('/api/v1/health')) {
    return next();
  }

  try {
    const activeProjectId = req.cookies.activeProjectId;
    const selectedPersonaId = req.cookies.selectedPersonaId;

    const context = await projectService.getDashboardContext(activeProjectId, selectedPersonaId);

    // クッキーが実際のIDとずれている、または未設定の場合は同期する
    if (context.activeProjectId && context.activeProjectId !== activeProjectId) {
      res.cookie('activeProjectId', context.activeProjectId);
    }

    // リクエストオブジェクトにコンテキストを格納 (コントローラから参照可能)
    req.activeProject = context.activeProject;
    req.projects = context.projects;
    req.activeProjectId = context.activeProjectId;
    req.selectedPersonaId = context.selectedPersonaId;

    // EJS テンプレートで直接参照できるように res.locals にセット
    res.locals.activeProject = context.activeProject;
    res.locals.projects = context.projects;
    res.locals.activeProjectId = context.activeProjectId;
    res.locals.selectedPersonaId = context.selectedPersonaId;

    next();
  } catch (err) {
    console.error('Failed to resolve project context in middleware', err);
    next();
  }
};
