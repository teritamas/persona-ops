const express = require('express');
const router = express.Router();

const chatRoutes = require('./chatRoutes');
const personaRoutes = require('./personaRoutes');
const simulationRoutes = require('./simulationRoutes');
const resourceRoutes = require('./resourceRoutes');
const projectRoutes = require('./projectRoutes');

router.use('/', chatRoutes);
router.use('/', personaRoutes);
router.use('/', simulationRoutes);
router.use('/', resourceRoutes);
router.use('/', projectRoutes);

// デバッグ用初期リセット
const { state, getActiveProject } = require('../services/dummy_data/store');
router.get('/action/reset', (req, res) => {
  state.simulationDone = false;
  state.selectedPersonaId = null;
  const activeProject = getActiveProject();
  if (!activeProject.isInitial) {
    if (!activeProject.activeChat) {
      activeProject.activeChatId = 'chat_new';
      activeProject.chats.push({ id: 'chat_new', title: 'New Chat', messages: [] });
      activeProject.activeChat = activeProject.chats[activeProject.chats.length - 1];
    }
    activeProject.activeChat.messages = [
      { id: 1, role: 'user', text: 'GitHubのリポジトリURLと、前回のユーザーインタビューの議事録（PDF）をアップロードしました。これをもとに、現在の主要なユーザーペルソナを作成してほしいです。', time: '10:00 AM' },
      { id: 2, role: 'agent', text: 'ドキュメントを読み込み、オントロジーを構築しました。\n抽出された業務フローと課題感から、5パターンのペルソナ群を生成可能です。\n生成を開始しますか？', time: '10:01 AM', isSystem: true },
      { id: 3, role: 'user', text: 'はい、作成してください。', time: '10:02 AM' },
      { id: 4, role: 'agent', text: '承知しました。情報を紐付けた仮想ペルソナ群を生成しました。中央の広場から確認できます。続けて、新機能の要件定義とシミュレーションを行いますか？', time: '10:02 AM' }
    ];
    activeProject.personas.forEach(p => p.reaction = null);
  }
  res.redirect('/');
});

module.exports = router;
