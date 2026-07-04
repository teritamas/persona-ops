const { state, getActiveProject } = require('./dummy_data/store');

class SimulationService {
  async simulate(text, time) {
    const activeProject = getActiveProject();

    if (activeProject.isInitial) {
      activeProject.isInitial = false;
      activeProject.personas = [
        { id: 'p1', name: '鈴木 健太', role: '現場セールス', x: 20, y: 30, avatarSeed: 'Felix', traits: ['効率重視', '外出多い'], reaction: null },
        { id: 'p2', name: '佐藤 真由美', role: 'マネージャー', x: 70, y: 40, avatarSeed: 'Aneka', traits: ['データ重視', '管理職'], reaction: null },
        { id: 'p3', name: '田中 宏', role: '内勤営業', x: 45, y: 60, avatarSeed: 'Jasper', traits: ['PCメイン', '丁寧'], reaction: null },
        { id: 'p4', name: '高橋 涼子', role: '営業企画', x: 80, y: 70, avatarSeed: 'Avery', traits: ['分析好き', '新しい物好き'], reaction: null },
        { id: 'p5', name: '伊藤 健', role: '若手セールス', x: 30, y: 80, avatarSeed: 'Leo', traits: ['スマホネイティブ', 'フットワーク軽'], reaction: null },
      ];

      if (!activeProject.activeChat) {
        activeProject.activeChatId = 'chat_new';
        activeProject.chats.push({ id: 'chat_new', title: 'New Chat', messages: [] });
        activeProject.activeChat = activeProject.chats[activeProject.chats.length - 1];
      }
      activeProject.activeChat.messages.push(
        { id: Date.now(), role: 'user', text: text, time: time },
        { id: Date.now() + 1, role: 'agent', text: '✨ 解析が完了しました！\n\n主要なペルソナを生成し、広場に配置しました。続けて、新機能の要件をシミュレーションしてみましょう。', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
      );

      return { isInitial: true, activeProject };
    }

    const userMsg = { id: Date.now(), role: 'user', text: text, time: time };
    if (!activeProject.activeChat) {
      activeProject.activeChatId = 'chat_new';
      activeProject.chats.push({ id: 'chat_new', title: 'New Chat', messages: [] });
      activeProject.activeChat = activeProject.chats[activeProject.chats.length - 1];
    }
    activeProject.activeChat.messages.push(userMsg);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    state.simulationDone = true;
    const summaryText = `シミュレーションが完了しました。中央の広場でペルソナたちの反応を確認してください。\n\n**シミュレーション結果のサマリー**\n- 賛成派（3名）: 「移動中の入力が楽になる」「データ化が早まる」と好意的です。\n- 懸念あり（2名）: 「要約の精度」「社内で音声入力しづらい」という課題が挙がっています。\n\n特に「音声入力の利用環境（オフィス内での配慮）」と「AI要約の信頼性確保」が今後の要件定義の鍵になりそうです。`;

    const agentMsg = {
      id: Date.now() + 1,
      role: 'agent',
      text: summaryText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    activeProject.activeChat.messages.push(agentMsg);

    activeProject.personas.forEach(p => {
      p.reaction = { type: ['positive', 'neutral', 'negative'][Math.floor(Math.random() * 3)], text: 'モックのリアクションです。' };
    });

    return { 
      isInitial: false, 
      activeProject, 
      userMsg, 
      agentMsg, 
      selectedPersonaId: state.selectedPersonaId, 
      simulationDone: state.simulationDone 
    };
  }

  async simulateReactions() {
    const activeProject = getActiveProject();
    state.simulationDone = true;
    
    const reactions = {
      p1: '移動先や現場から音声で要件や進捗を入力できれば、帰社後の事務作業が激減しそうです！',
      p2: 'メンバーの音声入力データの要約精度が気になります。誤記が多いとチェックの手間が増えます。',
      p3: 'オフィス内では音声入力は使いづらいので、内勤としてはテキスト入力のUIが使いやすいと嬉しいです。',
      p4: '顧客の声がリアルタイムにテキスト化されるなら、営業企画としてのデータ分析やニーズ抽出に活用できそう。',
      p5: 'スマホから手軽に音声で日報を入力できれば、タイピングより断然楽なので毎日続けられそうです！'
    };

    activeProject.personas.forEach(p => {
      p.reaction = {
        type: p.id === 'p2' || p.id === 'p3' ? 'neutral' : 'positive',
        text: reactions[p.id] || 'フィードバックを検討中...'
      };
    });

    const projectService = require('./projectService');
    await projectService.syncProject(activeProject);
    return activeProject;
  }
}

module.exports = new SimulationService();
