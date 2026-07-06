const express = require('express');
const router = express.Router();
const projectContext = require('../middlewares/projectContext');

const chatRoutes = require('./chatRoutes');
const personaRoutes = require('./personaRoutes');
const simulationRoutes = require('./simulationRoutes');
const resourceRoutes = require('./resourceRoutes');
const requirementRoutes = require('./requirementRoutes');
const projectRoutes = require('./projectRoutes');

// プロジェクトIDを持たないルート（ウェルカム画面、プロジェクト新規作成、プロジェクト削除等）
router.use('/', projectRoutes);

// プロジェクトIDを持つルートのためのサブルーター（パラメータ引き継ぎのため mergeParams: true に設定）
const projectSpecificRouter = express.Router({ mergeParams: true });
projectSpecificRouter.use(projectContext);
projectSpecificRouter.use((req, res, next) => {
  if (!req.activeProject || !req.activeProject.id) {
    return res.status(404).send('Project not found');
  }
  next();
});

projectSpecificRouter.use('/', chatRoutes);
projectSpecificRouter.use('/', personaRoutes);
projectSpecificRouter.use('/', simulationRoutes);
projectSpecificRouter.use('/', resourceRoutes);
projectSpecificRouter.use('/', requirementRoutes);

// プロジェクトID直下のルート（例: GET /:projectId）でダッシュボードを表示
const projectController = require('../controllers/projectController');
projectSpecificRouter.get('/view/topnav', projectController.getTopNav);
projectSpecificRouter.get('/view/sidebar', projectController.getSidebar);
projectSpecificRouter.get('/requirements/edit', projectController.getDashboard);
projectSpecificRouter.get('/requirements/:requirementId/edit', projectController.getDashboard);
projectSpecificRouter.get('/requirements/:requirementId', projectController.getDashboard);
projectSpecificRouter.get('/requirements', projectController.getDashboard);
projectSpecificRouter.get('/resource', projectController.getDashboard);
projectSpecificRouter.get('/', projectController.getDashboard);

router.use('/:projectId', projectSpecificRouter);

module.exports = router;

