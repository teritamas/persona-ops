const express = require('express');
const router = express.Router();

router.post('/api/chat/persona/:personaId', (req, res) => {
  const activeProject = getActiveProject();
  const persona = activeProject.personas.find(p => p.id === req.params.personaId);
  
  if (!persona) {
    return res.status(404).send('Persona not found');
  }

  const newChatId = 'chat_' + Date.now();
  const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const newChat = {
    id: newChatId,
    type: 'persona',
    personaId: persona.id,
    title: persona.name + 'との個別チャット',
    messages: [
      { id: 1, role: 'agent', text: `こんにちは。${persona.role}の${persona.name}です。どのようなことについてお話ししましょうか？`, time: nowStr }
    ]
  };

  activeProject.chats.push(newChat);
  activeProject.activeChatId = newChatId;
  activeProject.isInitial = false; // ensure chat UI is shown

  res.set('HX-Redirect', '/');
  res.send('');
});

const { state, mockProjects, getActiveProject } = require('../data/store');
const { renderChatMessage, renderSandbox } = require('../utils/renderers');

// ==========================================

// 1. 左パネル：チャットインターフェース
router.get('/menu/chat', (req, res) => {
  const activeProject = getActiveProject();

  let mainAreaHtml;

  if (activeProject.isInitial || !activeProject.activeChat || activeProject.activeChat.messages.length === 0) {
    // 初期状態：ウェルカム画面とサジェストボタンを表示
    mainAreaHtml = `
      <div class="flex-1 flex flex-col h-full bg-white relative">
        <div class="h-10 flex items-center px-6 border-b border-slate-100 bg-white shrink-0">
          <h1 class="text-sm font-bold text-slate-800 flex items-center">${activeProject.activeChat ? activeProject.activeChat.title : '新しいチャット'}</h1>
        </div>
        <div class="flex-1 flex flex-col items-center justify-center bg-slate-50/30 p-6 overflow-y-auto">
           <div class="max-w-3xl mx-auto w-full flex flex-col items-center animate-fade-in">
             <div class="w-20 h-20 bg-gradient-to-br from-orange-400 to-orange-500 rounded-[2rem] flex items-center justify-center text-white font-bold mb-8 shadow-xl shadow-orange-500/30">
                <svg class="w-10 h-10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
             </div>
             <h2 class="text-3xl font-extrabold text-slate-800 mb-4 tracking-tight">PersonaOps へようこそ</h2>
             <p class="text-slate-500 text-center mb-10 max-w-lg leading-relaxed font-medium">
               ユーザーインタビューや要件定義書などのドキュメントを共有して、あなたのプロダクトを利用する「仮想ペルソナ群」を構築しましょう。
             </p>
             
             <div class="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                <button hx-post="/api/simulate" hx-vals='{"inputText": "先週のユーザーインタビュー議事録と、既存SFAの仕様書をアップロードします。これをもとにペルソナを作成してください。"}' hx-target="#app-main-content" class="flex items-start text-left w-full bg-white border border-slate-200 hover:border-orange-300 hover:bg-orange-50 p-4 rounded-xl transition-all shadow-sm group">
                  <div class="shrink-0 mt-0.5 mr-3 bg-slate-50 group-hover:bg-white p-2 rounded-lg border border-slate-100 transition-colors">
                    <svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                  </div>
                  <span class="text-sm text-slate-600 font-medium leading-relaxed group-hover:text-orange-700 transition-colors">
                    先週のユーザーインタビュー議事録と、既存仕様書からペルソナを作成する
                  </span>
                </button>
                <button hx-post="/api/simulate" hx-vals='{"inputText": "GitHubのIssue URLを共有します。これをもとにエンジニアペルソナを作成してください。"}' hx-target="#app-main-content" class="flex items-start text-left w-full bg-white border border-slate-200 hover:border-orange-300 hover:bg-orange-50 p-4 rounded-xl transition-all shadow-sm group">
                  <div class="shrink-0 mt-0.5 mr-3 bg-slate-50 group-hover:bg-white p-2 rounded-lg border border-slate-100 transition-colors">
                    <svg class="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
                  </div>
                  <span class="text-sm text-slate-600 font-medium leading-relaxed group-hover:text-orange-700 transition-colors">
                    GitHubのIssue URLを読み込んで、エンジニアペルソナを生成する
                  </span>
                </button>
             </div>
           </div>
        </div>
        
        <!-- Input Form (Full width version) -->
        <div class="p-4 bg-white border-t border-slate-100 shrink-0">
          <div class="max-w-3xl mx-auto w-full">
            <form hx-post="/api/simulate" hx-target="#app-main-content" class="relative flex items-center">
              <button type="button" class="absolute left-4 p-2 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-full transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
              </button>
              <input name="inputText" type="text" placeholder="機能アイデアやAIへの相談を入力..." class="w-full bg-slate-100 text-slate-800 text-sm rounded-2xl py-4 pl-14 pr-14 border border-transparent focus:outline-none focus:border-orange-200 focus:bg-white focus:ring-4 focus:ring-orange-500/10 transition-all shadow-inner shadow-slate-200/50" required />
              <button type="submit" class="absolute right-3 bg-orange-500 text-white p-2.5 rounded-xl hover:bg-orange-600 hover:shadow-lg hover:shadow-orange-500/30 transition-all active:scale-95">
                <svg class="w-4 h-4 ml-0.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"></path></svg>
              </button>
            </form>
          </div>
        </div>
      </div>
    `;
  } else {
    let chatHeaderTitleHtml = `<h1 class="text-sm font-bold text-slate-800 flex items-center">${activeProject.activeChat.title}</h1>`;
    
    if (activeProject.activeChat.type === 'persona') {
      const p = activeProject.personas.find(p => p.id === activeProject.activeChat.personaId);
      if (p) {
        chatHeaderTitleHtml = `
          <div class="flex items-center gap-3">
            <div class="w-7 h-7 bg-slate-100 rounded-full border border-orange-200 overflow-hidden flex items-center justify-center">
              <img src="https://api.dicebear.com/7.x/micah/svg?seed=${p.avatarSeed}&backgroundColor=f8fafc" class="w-full h-full object-cover scale-110" />
            </div>
            <div class="flex flex-col">
              <div class="flex items-center gap-2">
                <h1 class="text-sm font-bold text-slate-800">${activeProject.activeChat.title}</h1>
              </div>
            </div>
          </div>
        `;
      }
    }

    const renderedMessages = (activeProject.activeChat.messages || []).map(msg => renderChatMessage(msg, activeProject)).join('');
    mainAreaHtml = `
      <div class="flex-1 flex flex-col h-full bg-white relative">
        <!-- Header -->
        <div class="h-10 flex items-center justify-between px-6 border-b border-slate-100 bg-white shrink-0">
          ${chatHeaderTitleHtml}
          <button hx-post="/api/chat/new" hx-target="#left-panel-content" hx-swap="innerHTML" class="text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 px-3 py-1.5 rounded-lg flex items-center transition-colors">
            <svg class="w-[0.875rem] h-[0.875rem] mr-1 opacity-70" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"></path></svg> 新しいチャット
          </button>
        </div>
        
        <div class="flex-1 bg-slate-50/30 p-6 overflow-y-auto flex flex-col">
          <div id="chat-messages-container" class="space-y-6">
            <div class="text-center text-xs text-slate-400 font-medium my-4">Today</div>
            ${renderedMessages}
          </div>
          
          <!-- Suggestions -->
          <div id="suggestions-box" class="mt-4 flex flex-col gap-2">
            <p class="text-[10px] font-bold text-slate-400 ml-1 mb-1 flex items-center">
              <svg class="w-[0.875rem] h-[0.875rem] text-orange-400 mr-1" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg>
              次のアクション提案
            </p>
            <button 
              hx-get="/api/suggest/res" 
              hx-target="#inputText" 
              hx-swap="outerHTML"
              class="flex items-start text-left w-full bg-white border border-slate-200 hover:border-orange-300 hover:bg-orange-50 p-3 rounded-xl transition-all shadow-sm group"
            >
              <div class="shrink-0 mt-0.5 mr-3 bg-slate-50 group-hover:bg-white p-1.5 rounded-lg border border-slate-100 transition-colors">
                <svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
              </div>
              <span class="text-xs text-slate-600 font-medium leading-relaxed group-hover:text-orange-700 transition-colors">
                最新のユーザーリサーチ結果をアップロードしてペルソナを更新する
              </span>
            </button>
            <button 
              hx-get="/api/suggest/sim" 
              hx-target="#inputText" 
              hx-swap="outerHTML"
              class="flex items-start text-left w-full bg-white border border-slate-200 hover:border-orange-300 hover:bg-orange-50 p-3 rounded-xl transition-all shadow-sm group"
            >
              <div class="shrink-0 mt-0.5 mr-3 bg-slate-50 group-hover:bg-white p-1.5 rounded-lg border border-slate-100 transition-colors">
                <svg class="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 01-2 2h0a2 2 0 01-2 2v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>
              </div>
              <span class="text-xs text-slate-600 font-medium leading-relaxed group-hover:text-orange-700 transition-colors">
                新機能「SFAモバイル音声入力」の要件定義とシミュレーションを開始する
              </span>
            </button>
          </div>
        </div>
          
        <!-- Input Form -->
        <div class="p-4 bg-white border-t border-slate-100 shrink-0">
          <form 
            hx-post="/api/simulate" 
            hx-target="#sandbox-characters" 
            hx-swap="innerHTML" 
            class="relative flex items-center"
          >
            <button type="button" class="absolute left-4 p-2 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-full transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
            </button>
            <input 
              id="inputText"
              name="inputText"
              type="text" 
              placeholder="AIへの指示を入力..." 
              class="w-full bg-slate-100 text-slate-800 text-sm rounded-2xl py-4 pl-14 pr-14 border border-transparent focus:outline-none focus:border-orange-200 focus:bg-white focus:ring-4 focus:ring-orange-500/10 transition-all shadow-inner shadow-slate-200/50" 
              required 
            />
            <button type="submit" class="absolute right-3 bg-orange-500 text-white p-2.5 rounded-xl hover:bg-orange-600 hover:shadow-lg hover:shadow-orange-500/30 transition-all active:scale-95">
              <svg class="w-4 h-4 ml-0.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"></path></svg>
            </button>
          </form>
        </div>
    `;
  }

  res.send(`
    <div class="flex h-full w-full">
      ${mainAreaHtml}
    </div>
  `);
});

// 2. 左パネル：リソースツリー
router.get('/menu/resources', (req, res) => {
  res.send(`
    <!-- Left Column: Resources List -->
    <div class="h-10 flex items-center justify-between px-6 border-b border-slate-100 bg-white shrink-0">
      <h1 class="text-sm font-bold text-slate-800 flex items-center">リソース一覧</h1>
      <button class="text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-lg flex items-center transition-colors">
        <svg class="w-[0.875rem] h-[0.875rem] mr-1" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg> 追加
      </button>
    </div>
    
    <div class="flex-1 overflow-y-auto p-4 bg-slate-50/30">
      <div class="space-y-1">
        <details class="group/folder" open>
          <summary class="flex items-center w-full hover:bg-slate-100 p-2 rounded-lg text-slate-700 list-none cursor-pointer transition-colors">
            <span class="w-4 h-4 mr-1 flex items-center justify-center text-slate-400 group-open/folder:rotate-90 transition-transform">
              <svg class="w-[0.875rem] h-[0.875rem]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"></path></svg>
            </span>
            <span class="text-orange-400 mr-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>
            </span>
            <span class="text-sm font-bold">ユーザーインタビュー</span>
          </summary>
          <div class="ml-5 pl-3 border-l border-slate-200 flex flex-col gap-1 mt-1">
            <div class="flex items-center justify-between w-full hover:bg-slate-100 p-2 rounded-lg text-slate-600 transition-colors group cursor-pointer">
              <div class="flex items-center overflow-hidden">
                <svg class="w-[0.875rem] h-[0.875rem] text-blue-400 mr-2 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                <span class="text-xs font-medium truncate">2023下期_営業部門ヒアリング.pdf</span>
              </div>
              <span class="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">2023.10.15</span>
            </div>
            <div class="flex items-center justify-between w-full hover:bg-slate-100 p-2 rounded-lg text-slate-600 transition-colors group cursor-pointer">
              <div class="flex items-center overflow-hidden">
                <svg class="w-[0.875rem] h-[0.875rem] text-blue-400 mr-2 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                <span class="text-xs font-medium truncate">2024上期_マネージャー層.md</span>
              </div>
              <span class="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">2024.02.20</span>
            </div>
          </div>
        </details>
        
        <details class="group/folder" open>
          <summary class="flex items-center w-full hover:bg-slate-100 p-2 rounded-lg text-slate-700 list-none cursor-pointer transition-colors">
            <span class="w-4 h-4 mr-1 flex items-center justify-center text-slate-400 group-open/folder:rotate-90 transition-transform">
              <svg class="w-[0.875rem] h-[0.875rem]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"></path></svg>
            </span>
            <span class="text-orange-400 mr-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>
            </span>
            <span class="text-sm font-bold">仕様書・要件定義</span>
          </summary>
          <div class="ml-5 pl-3 border-l border-slate-200 flex flex-col gap-1 mt-1">
            <div class="flex items-center w-full hover:bg-slate-100 p-2 rounded-lg text-slate-600 transition-colors cursor-pointer">
              <svg class="w-[0.875rem] h-[0.875rem] text-slate-400 mr-2 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
              <span class="text-xs font-medium truncate">GitHub Issue #142 (モバイル刷新)</span>
            </div>
            <div class="flex items-center w-full hover:bg-slate-100 p-2 rounded-lg text-slate-600 transition-colors cursor-pointer">
              <svg class="w-[0.875rem] h-[0.875rem] text-slate-400 mr-2 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
              <span class="text-xs font-medium truncate">Notion: 新規ダッシュボード要件</span>
            </div>
          </div>
        </details>
      </div>
    </div>
  `);
});

// 3. アクションサジェスト用のレスポンス (入力欄の自動入力)
router.get('/api/suggest/res', (req, res) => {
  res.send(`
    <input 
      id="inputText"
      name="inputText"
      type="text" 
      value="先週実施したユーザーインタビューの議事録をアップロードします。これをもとにペルソナをアップデートしてください。"
      class="w-full bg-slate-100 text-slate-800 text-sm rounded-2xl py-4 pl-14 pr-14 border border-transparent focus:outline-none focus:border-orange-200 focus:bg-white focus:ring-4 focus:ring-orange-500/10 transition-all"
      required
    />
  `);
});

router.get('/api/suggest/sim', (req, res) => {
  res.send(`
    <input 
      id="inputText"
      name="inputText"
      type="text" 
      value="新機能「SFAモバイル音声入力」の要件定義を行いたいです。シミュレーションをお願いします。"
      class="w-full bg-slate-100 text-slate-800 text-sm rounded-2xl py-4 pl-14 pr-14 border border-transparent focus:outline-none focus:border-orange-200 focus:bg-white focus:ring-4 focus:ring-orange-500/10 transition-all"
      required
    />
  `);
});

// 4. ペルソナ詳細の取得
router.get('/api/persona/:id', (req, res) => {
  const pId = req.params.id;
  const activeProject = getActiveProject();
  const p = activeProject.personas.find(persona => persona.id === pId);
  state.selectedPersonaId = pId; // メモリ上で現在選択されているペルソナを更新

  if (!p) {
    return res.send(`
      <div class="h-full flex flex-col items-center justify-center text-slate-400 opacity-50 p-6 text-center">
        <svg class="w-12 h-12 mb-4 text-slate-300" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
        <p class="text-sm font-medium text-slate-500">ペルソナを選択</p>
      </div>
    `);
  }

  // OOB スワップ用の箱庭再レンダリングを含めることで、選択状態枠線を付与
  const updatedSandbox = renderSandbox(state.simulationDone, activeProject, state.selectedPersonaId);

  res.send(`
    <aside id="detail-panel" class="w-[360px] bg-white border-l border-slate-200 z-30 flex flex-col shrink-0 overflow-y-auto" style="display: flex;">
      <!-- Detail Panel Header -->
    <div class="h-10 flex items-center justify-between px-6 border-b border-slate-100 bg-white shrink-0">
      <h2 class="text-sm font-bold text-slate-800 flex items-center">ペルソナ詳細</h2>
      <button 
        hx-get="/api/persona/close" 
        hx-target="#detail-panel" 
        hx-swap="innerHTML"
        class="text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-full p-1.5 transition-colors"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
      </button>
    </div>

    <!-- Detail Content -->
    <div class="p-6">
      <div class="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 relative overflow-hidden group">
        <div class="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-orange-100/60 to-transparent rounded-bl-full -z-10 transition-transform duration-500 group-hover:scale-110"></div>
        
        <div class="flex justify-between items-start mb-2">
          <span class="text-xs font-bold text-orange-500 bg-orange-50 px-2 py-1 rounded-md">${p.role}</span>
        </div>

        <div class="flex flex-col items-center mb-6 mt-2">
          <div class="relative mb-4">
            <div class="w-14 h-14 rounded-full border-4 border-white shadow-md overflow-hidden bg-slate-100 relative z-10 flex items-center justify-center">
              <img src="https://api.dicebear.com/7.x/micah/svg?seed=${p.avatarSeed}&backgroundColor=f8fafc" alt="${p.name}" class="w-full h-full object-cover scale-110" />
            </div>
            <div class="absolute inset-0 rounded-full border border-orange-200 scale-110 -z-0"></div>
          </div>
          <h2 class="text-lg font-bold text-slate-800">${p.name}</h2>
        </div>

        <div class="mb-6">
          <h3 class="text-xs font-bold text-slate-700 mb-3 flex items-center uppercase tracking-wider">
            <svg class="w-[0.875rem] h-[0.875rem] text-orange-500 mr-2" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg> 特徴
          </h3>
          <div class="flex flex-wrap gap-2">
            ${p.traits.map(t => `<span class="px-3 py-1.5 bg-slate-50 text-slate-600 rounded-full text-[10px] font-medium border border-slate-200">${t}</span>`).join('')}
          </div>
        </div>

        <div class="mb-6">
          <h3 class="text-xs font-bold text-slate-700 mb-3 flex items-center uppercase tracking-wider">
            <svg class="w-[0.875rem] h-[0.875rem] text-blue-500 mr-2" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg> オントロジーリソース
          </h3>
          <div class="text-xs text-slate-600 leading-relaxed ml-2 space-y-1">
            <p class="flex items-center"><span class="w-1 h-1 rounded-full bg-slate-400 mr-2 shrink-0"></span>2023_ユーザーインタビュー_営業部.pdf</p>
            <p class="flex items-center"><span class="w-1 h-1 rounded-full bg-slate-400 mr-2 shrink-0"></span>GitHub Issue #241 要望一覧</p>
          </div>
        </div>

        ${state.simulationDone ? `
          <div>
            <h3 class="text-xs font-bold text-slate-700 mb-3 flex items-center tracking-wider">
              <svg class="w-[0.875rem] h-[0.875rem] text-blue-500 mr-2" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> リサーチインサイト
            </h3>
            <div class="ml-2">
              <p class="text-sm text-slate-700 italic font-medium leading-relaxed">「${p.reaction.text}」</p>
              <div class="mt-2 pt-2 border-t border-slate-100 flex items-center text-[10px] text-slate-500">
                <svg class="w-[0.875rem] h-[0.875rem] text-orange-400 mr-1" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                AI推論元: 2023年下期ヒアリングログ
              </div>
            </div>
          </div>
        ` : ''}
      </div>
    </div>

    <!-- Action -->
    <div class="mt-auto p-6 bg-white border-t border-slate-100">
      <button hx-post="/api/chat/persona/${p.id}" class="w-full flex items-center justify-center text-sm font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 py-3 rounded-xl shadow-sm transition-colors group">
        このペルソナと個別にチャット
      </button>
    </div>
    </aside>

    <!-- OOB Update sandbox characters to show selected state -->
    <div id="sandbox-characters" hx-swap-oob="innerHTML">
      ${updatedSandbox}
    </div>
  `);
});

// ペルソナ詳細を閉じる
router.get('/api/persona/close', (req, res) => {
  state.selectedPersonaId = null;
  const activeProject = getActiveProject();
  const updatedSandbox = renderSandbox(state.simulationDone, activeProject, state.selectedPersonaId);
  res.send(`
    <aside id="detail-panel" class="w-[360px] bg-white border-l border-slate-200 z-30 flex flex-col shrink-0 overflow-y-auto" style="display: none;">
    </aside>

    <!-- OOB Update sandbox to remove selected border -->
    <div id="sandbox-characters" hx-swap-oob="innerHTML">
      ${updatedSandbox}
    </div>
  `);
});

// 5. シミュレーションの実行 (要件送信)
router.post('/api/simulate', (req, res) => {
  const text = req.body.inputText || '新機能のシミュレーション';
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const activeProject = getActiveProject();

  // 初期状態の場合、ペルソナ生成シミュレーションを行う（今回はモックなのでプロジェクト状態を更新）
  if (activeProject.isInitial) {
    activeProject.isInitial = false;

    // 新規ペルソナダミーデータ追加
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

    // HX-Refreshで全体をリロードしてレイアウトを切り替えるか、HX-Redirectを行う
    // 今回は HTMX-Redirect ヘッダーでトップ画面ごとリロードさせるのが簡単
    res.set('HX-Redirect', '/');
    return res.send();
  }

  // 1. ユーザーの入力を追加
  const userMsg = { id: Date.now(), role: 'user', text: text, time: time };
  if (!activeProject.activeChat) {
    activeProject.activeChatId = 'chat_new';
    activeProject.chats.push({ id: 'chat_new', title: 'New Chat', messages: [] });
    activeProject.activeChat = activeProject.chats[activeProject.chats.length - 1];
  }
  activeProject.activeChat.messages.push(userMsg);

  // 1.5秒待ってシミュレーション完了結果を返す
  setTimeout(() => {
    state.simulationDone = true;

    // エージェントの回答を追加
    const summaryText = `シミュレーションが完了しました。中央の広場でペルソナたちの反応を確認してください。\n\n**シミュレーション結果のサマリー**\n- 賛成派（3名）: 「移動中の入力が楽になる」「データ化が早まる」と好意的です。\n- 懸念あり（2名）: 「要約の精度」「社内で音声入力しづらい」という課題が挙がっています。\n\n特に「音声入力の利用環境（オフィス内での配慮）」と「AI要約の信頼性確保」が今後の要件定義の鍵になりそうです。`;

    const agentMsg = {
      id: Date.now() + 1,
      role: 'agent',
      text: summaryText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    activeProject.activeChat.messages.push(agentMsg);

    // 今回は全ペルソナにリアクションをセットする（モック）
    activeProject.personas.forEach(p => {
      p.reaction = { type: ['positive', 'neutral', 'negative'][Math.floor(Math.random() * 3)], text: 'モックのリアクションです。' };
    });

    // 箱庭（吹き出し付きアバター）を構築
    const sandboxHtml = renderSandbox(true, activeProject, state.selectedPersonaId);

    // チャットの追加メッセージを生成
    const userMsgHtml = renderChatMessage(userMsg);
    const agentMsgHtml = renderChatMessage(agentMsg);

    // 現在の選択中ペルソナのリアクション情報も含めて詳細パネルを更新
    let detailPanelOob = '';
    if (state.selectedPersonaId) {
      const p = activeProject.personas.find(persona => persona.id === state.selectedPersonaId);
      if (p) {
        detailPanelOob = `
          <aside id="detail-panel" hx-swap-oob="true" class="w-[360px] bg-white border-l border-slate-200 z-30 flex flex-col shrink-0 overflow-y-auto" style="display: flex;">
            <!-- Detail Panel Header -->
            <div class="h-10 flex items-center justify-between px-6 border-b border-slate-100 bg-white shrink-0">
              <h2 class="text-sm font-bold text-slate-800 flex items-center">ペルソナ詳細</h2>
              <button hx-get="/api/persona/close" hx-target="#detail-panel" hx-swap="outerHTML" class="text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-full p-1.5 transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <!-- Detail Content -->
            <div class="p-6">
              <div class="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 relative overflow-hidden group">
                <div class="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-orange-100/60 to-transparent rounded-bl-full -z-10"></div>
                <div class="flex justify-between items-start mb-2">
                  <span class="text-xs font-bold text-orange-500 bg-orange-50 px-2 py-1 rounded-md">${p.role}</span>
                </div>
                <div class="flex flex-col items-center mb-6 mt-2">
                  <div class="relative mb-4">
                    <div class="w-14 h-14 rounded-full border-4 border-white shadow-md overflow-hidden bg-slate-100 relative z-10 flex items-center justify-center">
                      <img src="https://api.dicebear.com/7.x/micah/svg?seed=${p.avatarSeed}&backgroundColor=f8fafc" alt="${p.name}" class="w-full h-full object-cover scale-110" />
                    </div>
                    <div class="absolute inset-0 rounded-full border border-orange-200 scale-110 -z-0"></div>
                  </div>
                  <h2 class="text-lg font-bold text-slate-800">${p.name}</h2>
                </div>
                <div class="mb-6">
                  <h3 class="text-xs font-bold text-slate-700 mb-3 flex items-center uppercase tracking-wider">
                    <svg class="w-[0.875rem] h-[0.875rem] text-orange-500 mr-2" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg> 特徴
                  </h3>
                  <div class="flex flex-wrap gap-2">
                    ${p.traits.map(t => `<span class="px-3 py-1.5 bg-slate-50 text-slate-600 rounded-full text-[10px] font-medium border border-slate-200">${t}</span>`).join('')}
                  </div>
                </div>
                <div class="mb-6">
                  <h3 class="text-xs font-bold text-slate-700 mb-3 flex items-center uppercase tracking-wider">
                    <svg class="w-[0.875rem] h-[0.875rem] text-blue-500 mr-2" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg> オントロジーリソース
                  </h3>
                  <div class="text-xs text-slate-600 leading-relaxed ml-2 space-y-1">
                    <p class="flex items-center"><span class="w-1 h-1 rounded-full bg-slate-400 mr-2 shrink-0"></span>2023_ユーザーインタビュー_営業部.pdf</p>
                    <p class="flex items-center"><span class="w-1 h-1 rounded-full bg-slate-400 mr-2 shrink-0"></span>GitHub Issue #241 要望一覧</p>
                  </div>
                </div>
                <div>
                  <h3 class="text-xs font-bold text-slate-700 mb-3 flex items-center uppercase tracking-wider">
                    <svg class="w-[0.875rem] h-[0.875rem] text-blue-500 mr-2" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> Reaction Insight
                  </h3>
                  <div class="bg-orange-50/50 border border-orange-100 rounded-xl p-4">
                    <p class="text-sm text-slate-700 italic font-medium leading-relaxed">「${p.reaction.text}」</p>
                    <div class="mt-3 pt-3 border-t border-orange-200/50 flex items-center text-[10px] text-slate-500">
                      <svg class="w-3 h-3 text-orange-400 mr-1" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                      AI推論元: 2023年下期ヒアリングログ
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <!-- Action -->
            <div class="mt-auto p-6 bg-white border-t border-slate-100">
              <button hx-post="/api/chat/persona/${p.id}" class="w-full flex items-center justify-center text-sm font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 py-3 rounded-xl shadow-sm transition-colors group">
                このペルソナと個別にチャット
              </button>
            </div>
          </aside>
        `;
      }
    }

    res.send(`
      <!-- Main response: Render updated characters on the sandbox -->
      ${sandboxHtml}

      <!-- OOB: Append messages to chat box -->
      <div id="chat-messages-container" hx-swap-oob="beforeend">
        ${userMsgHtml}
        ${agentMsgHtml}
      </div>

      <!-- OOB: Clear and reset the input field -->
      <input 
        id="inputText"
        name="inputText"
        type="text" 
        value=""
        placeholder="新機能の仕様や質問を入力..."
        class="w-full bg-slate-100 text-slate-800 text-sm rounded-2xl py-4 pl-14 pr-14 border border-transparent focus:outline-none focus:border-orange-200 focus:bg-white focus:ring-4 focus:ring-orange-500/10 transition-all"
        required
        hx-swap-oob="true"
      />

      <!-- OOB: Render global reception rate inside header -->
      <div id="reception-rate-badge" hx-swap-oob="true" class="flex items-center gap-3 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm animate-fade-in">
        <span class="text-xs font-bold text-slate-500">全体受容度:</span>
        <span class="text-sm font-extrabold text-slate-800">72%</span>
        <span class="text-[10px] font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded">Good</span>
      </div>

      <!-- OOB: Optionally update the detail panel if a persona was selected -->
      ${detailPanelOob}
    `);
  }, 1500); // 1.5 seconds delay
});

// 初期リセット（デバッグ用）
router.get('/api/reset', (req, res) => {
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


// 新規チャット作成
router.post('/api/chat/new', (req, res) => {
  const activeProject = getActiveProject();
  const newId = 'chat_' + Date.now();
  activeProject.chats.push({
    id: newId,
    title: '新しいチャット',
    messages: []
  });
  activeProject.activeChatId = newId;
  res.set('HX-Redirect', '/');
  return res.send();
});

// チャット切り替え
router.get('/api/chat/:id', (req, res) => {
  const activeProject = getActiveProject();
  const chat = activeProject.chats.find(c => c.id === req.params.id);
  if (chat) {
    activeProject.activeChatId = chat.id;
  }
  res.set('HX-Redirect', '/');
  return res.send();
});

// プロジェクト切り替え
router.post('/api/project/switch', (req, res) => {
  state.activeProjectId = req.body.projectId;
  state.simulationDone = false;
  state.selectedPersonaId = null;
  res.set('HX-Redirect', '/');
  return res.send();
});

// 新規プロジェクト作成
router.post('/api/project/create', (req, res) => {
  const newProject = {
    id: `proj_${Date.now()}`,
    name: '新しいプロジェクト',
    isInitial: true,
    personas: [],
    chats: [],
    activeChatId: null
  };
  mockProjects.push(newProject);
  state.activeProjectId = newProject.id;
  state.simulationDone = false;
  state.selectedPersonaId = null;
  res.set('HX-Redirect', '/');
  return res.send();
});


router.get('/', (req, res) => {
  const activeProject = getActiveProject();
  res.render('index', {
    activeProject,
    mockProjects,
    activeProjectId: state.activeProjectId,
    isInitial: activeProject.isInitial,
    selectedPersonaId: state.selectedPersonaId
  });
});

router.get('/api/project/state', (req, res) => {
  const activeProject = getActiveProject();
  res.json({
    activeProjectId: activeProject.id,
    activeProjectName: activeProject.name,
    isInitial: activeProject.isInitial,
    projects: mockProjects
  });
});

module.exports = router;
