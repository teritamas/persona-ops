const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');

// ポータル画面 (ウェルカム画面)
router.get('/', projectController.getWelcomePage);

// プロジェクト作成・変更・削除（Cookie を使わず、ID を明示的に扱う）
router.post('/action/project/create', projectController.createProject);
router.post('/action/project/rename', projectController.renameProject);
router.post('/action/project/delete', projectController.deleteProject);

module.exports = router;
