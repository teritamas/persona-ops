const { requestPrivateApi } = require('../clients/private-api');
const { state, getActiveProject, initialPersonas } = require('./dummy_data/store');

class SimulationService {

  async simulateReactions() {
    const projectService = require('./projectService');
    // レンダリング前に、必ずバックエンドから最新のデータを取得する
    await projectService.fetchProjects();

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
        type: (p.id === 'p2' || p.id === 'p3') ? 'neutral' : 'positive',
        text: reactions[p.id] || 'フィードバックを検討中...'
      };
    });

    await projectService.syncProject(activeProject);
    return activeProject;
  }
}

module.exports = new SimulationService();
