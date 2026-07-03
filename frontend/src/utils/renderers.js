// ヘルパー: チャットメッセージをHTMLでレンダリング
function renderChatMessage(msg, activeProject) {
  const isUser = msg.role === 'user';
  let avatarHtml = '';
  let avatarContainerClass = '';
  
  if (isUser) {
    avatarHtml = `<img src="https://i.pravatar.cc/150?img=68" alt="Me" class="rounded-full w-full h-full object-cover" />`;
    avatarContainerClass = 'bg-slate-200 border border-slate-300';
  } else {
    // Check if we're in a persona chat
    if (activeProject && activeProject.activeChat && activeProject.activeChat.type === 'persona') {
      const p = activeProject.personas.find(p => p.id === activeProject.activeChat.personaId);
      if (p) {
        avatarHtml = `<img src="https://api.dicebear.com/7.x/micah/svg?seed=${p.avatarSeed}&backgroundColor=f8fafc" class="w-full h-full object-cover scale-110" />`;
        avatarContainerClass = 'bg-slate-100 border-2 border-orange-200 overflow-hidden';
      }
    }
    
    // Default agent avatar
    if (!avatarHtml) {
      avatarHtml = `<svg class="w-[1.125rem] h-[1.125rem] text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>`;
      avatarContainerClass = 'bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-md';
    }
  }

  return `
    <div class="flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-4">
      <div class="flex max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-end gap-3">
        <div class="w-8 h-8 rounded-full shrink-0 flex items-center justify-center ${avatarContainerClass}">
          ${avatarHtml}
        </div>
        <div class="flex flex-col ${isUser ? 'items-end' : 'items-start'}">
          <div class="px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${isUser ? 'bg-slate-800 text-white rounded-br-sm' : 'bg-white text-slate-700 border border-slate-200 rounded-bl-sm'}">
            ${msg.text.replace(/\\n/g, '<br/>')}
            ${msg.isSystem ? `
              <div class="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs text-orange-600 font-medium">
                <svg class="w-[1.125rem] h-[1.125rem] text-orange-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                オントロジーマッピング完了
              </div>
            ` : ''}
          </div>
          <span class="text-[10px] text-slate-400 mt-1 px-1">${msg.time}</span>
        </div>
      </div>
    </div>
  `;
}

// ヘルパー: 箱庭のキャラクターを描画
function renderSandbox(done, activeProject, selectedPersonaId) {
  return activeProject.personas.map((p, idx) => {
    // 感情別リアクションアイコン/スタイル
    let reactionHtml = '';
    if (done) {
      let iconColor = 'text-slate-500 bg-slate-100 border-slate-200';
      let iconSvg = `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>`;
      if (p.reaction.type === 'positive') {
        iconColor = 'text-green-600 bg-green-100 border-green-200';
        iconSvg = `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
      } else if (p.reaction.type === 'negative') {
        iconColor = 'text-red-600 bg-red-100 border-red-200';
        iconSvg = `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
      } else if (p.reaction.type === 'neutral') {
        iconColor = 'text-slate-600 bg-slate-100 border-slate-200';
        iconSvg = `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 13h6M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
      }

      reactionHtml = `
        <div class="absolute bottom-[90px] left-1/2 -translate-x-1/2 w-56 bg-white p-3 rounded-2xl shadow-xl border border-slate-100 animate-pop-in z-20 flex flex-col" style="animation-delay: ${idx * 0.2}s">
          <div class="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-b border-r border-slate-100 transform rotate-45"></div>
          <div class="flex items-center gap-2 mb-2 pb-2 border-b border-slate-50">
            <div class="shrink-0 p-1.5 rounded-full ${iconColor}">
              ${iconSvg}
            </div>
            <span class="text-xs font-bold text-slate-700 truncate">${p.name}</span>
          </div>
          <p class="text-xs text-slate-600 leading-relaxed font-medium">${p.reaction.text}</p>
        </div>
      `;
    }

    const isSelected = selectedPersonaId === p.id;
    return `
      <div 
        hx-get="/api/persona/${p.id}" 
        hx-target="#detail-panel" 
        hx-swap="outerHTML"
        class="absolute cursor-pointer group flex flex-col items-center transition-all duration-300 ${isSelected ? 'z-50 scale-110' : 'z-10'}"
        style="left: ${p.x}%; top: ${p.y}%; transform: translate(-50%, -50%)"
      >
        ${reactionHtml}
        <div class="relative animate-float flex flex-col items-center" style="animation-delay: ${idx * 0.5}s">
          <div class="absolute -bottom-4 w-10 h-2 bg-black/10 rounded-[100%] blur-sm"></div>
          <div class="w-14 h-14 bg-white rounded-full border-4 shadow-md overflow-hidden relative z-10 flex items-center justify-center transition-colors ${isSelected ? 'border-orange-400 shadow-orange-500/30' : 'border-white'}">
            <img src="https://api.dicebear.com/7.x/micah/svg?seed=${p.avatarSeed}&backgroundColor=f8fafc" alt="avatar" class="w-full h-full object-cover scale-110" />
          </div>
          <div class="mt-2 backdrop-blur-sm text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap transition-all shadow-sm ${isSelected ? 'bg-orange-500 text-white opacity-100' : 'bg-slate-800/80 text-white opacity-70 group-hover:opacity-100'}">
            ${p.role}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

module.exports = {
  renderChatMessage,
  renderSandbox
};
