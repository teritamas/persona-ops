const initialPersonas = [
  { id: 'p1', name: '鈴木 健太', role: '現場セールス', x: 20, y: 30, avatarSeed: 'Felix', traits: ['効率重視', '外出多い'], reaction: null },
  { id: 'p2', name: '佐藤 真由美', role: 'マネージャー', x: 70, y: 40, avatarSeed: 'Aneka', traits: ['データ重視', '管理職'], reaction: null },
  { id: 'p3', name: '田中 宏', role: '内勤営業', x: 45, y: 60, avatarSeed: 'Jasper', traits: ['PCメイン', '丁寧'], reaction: null },
  { id: 'p4', name: '高橋 涼子', role: '営業企画', x: 80, y: 70, avatarSeed: 'Avery', traits: ['分析好き', '新しい物好き'], reaction: null },
  { id: 'p5', name: '伊藤 健', role: '若手セールス', x: 30, y: 80, avatarSeed: 'Leo', traits: ['スマホネイティブ', 'フットワーク軽'], reaction: null },
];

const mockProjects = [
  {
    id: 'proj_1',
    name: 'SFA モバイルアプリ刷新',
    isInitial: false,
    personas: [
      {
        id: 'p1',
        name: '鈴木 健太',
        role: '現場セールス',
        x: 20,
        y: 30,
        avatarSeed: 'Felix',
        traits: ['効率重視', '外出多い'],
        reaction: {
          type: 'positive',
          text: '移動中の入力が楽になりそう！',
        },
      },
      {
        id: 'p2',
        name: '佐藤 真由美',
        role: 'マネージャー',
        x: 70,
        y: 40,
        avatarSeed: 'Aneka',
        traits: ['データ重視', '管理職'],
        reaction: { type: 'neutral', text: '要約の精度が気になります。' },
      },
      {
        id: 'p3',
        name: '田中 宏',
        role: '内勤営業',
        x: 45,
        y: 60,
        avatarSeed: 'Jasper',
        traits: ['PCメイン', '丁寧'],
        reaction: {
          type: 'negative',
          text: '社内だと声に出しづらいかも…',
        },
      },
      {
        id: 'p4',
        name: '高橋 涼子',
        role: '営業企画',
        x: 80,
        y: 70,
        avatarSeed: 'Avery',
        traits: ['分析好き', '新しい物好き'],
        reaction: {
          type: 'positive',
          text: 'データ化が早まるのは大賛成です。',
        },
      },
      {
        id: 'p5',
        name: '伊藤 健',
        role: '若手セールス',
        x: 30,
        y: 80,
        avatarSeed: 'Leo',
        traits: ['スマホネイティブ', 'フットワーク軽'],
        reaction: {
          type: 'positive',
          text: 'タイピングより早くて最高です！',
        },
      },
    ],
    chats: [
      {
        id: 'chat_1',
        title: '初期ペルソナ生成',
        messages: [
          {
            id: 1,
            role: 'user',
            text: 'GitHubのリポジトリURLと、前回のユーザーインタビューの議事録（PDF）をアップロードしました。これをもとに、現在の主要なユーザーペルソナを作成してほしいです。',
            time: '10:00 AM',
          },
          {
            id: 2,
            role: 'agent',
            text: 'ドキュメントを読み込み、オントロジーを構築しました。\\n抽出された業務フローと課題感から、5パターンを生成可能です。\\n生成を開始しますか？',
            time: '10:01 AM',
            isSystem: true,
          },
          { id: 3, role: 'user', text: 'はい、作成してください。', time: '10:02 AM' },
          {
            id: 4,
            role: 'agent',
            text: '承知しました。情報を紐付けた仮想ペルソナ群を生成しました。中央の広場から確認できます。続けて、新機能の要件定義とシミュレーションを行いますか？',
            time: '10:02 AM',
          },
        ],
      },
    ],
    activeChatId: 'chat_1',
  },
  {
    id: 'proj_2',
    name: '新規事業: 経費精算SaaS',
    isInitial: true,
    personas: [],
    chats: [],
    activeChatId: null,
  },
];

const state = {
  activeProjectId: 'proj_1',
  simulationDone: false,
  selectedPersonaId: null,
};

// アクティブプロジェクトとアクティブチャットを取得するヘルパー
function getActiveProject() {
  const proj =
    mockProjects.find((p) => p.id === state.activeProjectId) || mockProjects[0];
  proj.activeChat =
    (proj.chats && proj.chats.find((c) => c.id === proj.activeChatId)) ||
    (proj.chats && proj.chats[0]) ||
    { messages: [] };
  // ペルソナが存在しない場合を初期状態として定義する
  proj.isInitial = !proj.personas || proj.personas.length === 0;
  return proj;
}

module.exports = {
  mockProjects,
  state,
  getActiveProject,
  initialPersonas,
};

