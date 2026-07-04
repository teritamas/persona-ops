const projectService = require('../services/projectService');

module.exports = async (req, res, next) => {
  // パスが /healthz などヘルスチェック関連の場合はコンテキスト処理をスキップ
  if (req.path.startsWith('/health') || req.path.startsWith('/api/v1/health')) {
    return next();
  }

  try {
    // クッキーではなく、パスパラメータからプロジェクトIDを取得する
    const activeProjectId = req.params.projectId;
    let selectedPersonaId = req.cookies.selectedPersonaId;

    const context = await projectService.getDashboardContext(activeProjectId, selectedPersonaId);

    // 指定されたペルソナがプロジェクトの実在ペルソナ一覧にない場合はCookieをクリアして非表示にする
    if (selectedPersonaId && context.activeProject && context.activeProject.personas) {
      const hasPersona = context.activeProject.personas.some(p => p.id === selectedPersonaId);
      if (!hasPersona) {
        res.clearCookie('selectedPersonaId');
        selectedPersonaId = null;
        context.selectedPersonaId = null;
      }
    }

    // リクエストオブジェクトにコンテキストを格納 (コントローラから参照可能)
    req.activeProject = context.activeProject;
    req.projects = context.projects;
    req.activeProjectId = context.activeProjectId;
    req.selectedPersonaId = selectedPersonaId;

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
