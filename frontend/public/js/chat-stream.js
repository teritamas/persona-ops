if (typeof window !== "undefined" && window.marked) {
  window.marked.use({
    renderer: {
      link(token) {
        return `<a target="_blank" rel="noopener noreferrer" href="${token.href}">${token.text}</a>`;
      }
    }
  });
}

const SystemActionRegistry = [
  {
    tag: '[SYSTEM_ACTION: REQUIREMENT_SAVED]',
    text: '要件定義を作成しました',
    color: 'text-orange-500',
    iconSvg: `<svg class="w-3.5 h-3.5 mr-1.5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>`,
    onDetect: () => {
      const reqBadge = document.getElementById('requirement-notification-badge');
      if (reqBadge) reqBadge.classList.remove('hidden');
    }
  },
  {
    tag: '[SYSTEM_ACTION: PERSONAS_SAVED]',
    text: 'ペルソナを作成しました',
    color: 'text-emerald-500',
    iconSvg: `<svg class="w-3.5 h-3.5 mr-1.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>`,
    onDetect: () => {
      // 必要に応じて追加のUI処理を記述
    }
  },
  {
    tag: '[SYSTEM_ACTION: PROJECT_NAME_UPDATED]',
    text: 'プロジェクト名を更新しました',
    color: 'text-blue-500',
    iconSvg: `<svg class="w-3.5 h-3.5 mr-1.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>`,
    onDetect: () => {
      // 必要に応じて追加のUI処理を記述
    }
  }
];

function parseAndCleanSystemActions(text) {
  let cleaned = text;
  const detectedActions = [];

  SystemActionRegistry.forEach(action => {
    if (cleaned.includes(action.tag)) {
      cleaned = cleaned.replaceAll(action.tag, '');
      detectedActions.push(action);
    }
  });

  return {
    cleanedText: cleaned.trim(),
    actions: detectedActions
  };
}

function escapeHtml(string) {
  return String(string).replace(/[&<>"']/g, function (s) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[s];
  });
}

globalThis.submitSuggestion = function submitSuggestion(element) {
  const text = element.getAttribute('data-text');
  const input = document.getElementById('inputText');
  if (input && text) {
    input.value = text;
    const form = input.closest('form');
    if (form) {
      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    }
  }
};

// チャットウィンドウを最下部までスクロールする
function scrollToBottom() {
  const scrollContainer = document.getElementById('chat-messages-scroll');
  if (scrollContainer) {
    requestAnimationFrame(() => {
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    });
  }
}

// 新規プロジェクト作成時のメッセージ自動送信トリガー
function triggerPendingStreamChat() {
  const pendingText = sessionStorage.getItem('pendingStreamText');
  if (pendingText) {
    const input = document.getElementById('inputText');
    if (input) {
      // 確実に要素が見つかった段階でセッションを消去
      sessionStorage.removeItem('pendingStreamText');

      input.value = pendingText;
      const form = input.closest('form');
      if (form) {
        // HTMXやカスタムイベントに対応するため、少し遅延させてサブミット
        setTimeout(() => {
          form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }, 100);
      }
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  triggerPendingStreamChat();
  scrollToBottom();
});

// 非同期でチャット画面がロードされた際（HTMX swap完了時）にトリガー
document.addEventListener('htmx:afterSwap', (evt) => {
  if (evt.detail.target && evt.detail.target.id === 'left-panel-content') {
    triggerPendingStreamChat();
    scrollToBottom();
  }
});

globalThis.submitStreamChat = async function submitStreamChat(event) {
  event.preventDefault();

  const pathParts = window.location.pathname.split('/');
  const projectId = pathParts[1];

  const input = document.getElementById('inputText');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;

  const container = document.getElementById('chat-messages-container');
  if (!container) return;

  // 初回のインタラクション（初期状態）の場合、シミュレーション広場を表示して左パネルのサイズを調整する
  const playground = document.getElementById('simulation-playground');
  if (playground && playground.style.display === 'none') {
    playground.style.display = 'flex'; // Tailwind のクラスに合わせて flex を使用する
    const leftPanel = document.getElementById('left-panel-content');
    if (leftPanel) {
      // w-full から w-[400px] へ滑らかにアニメーションさせる
      leftPanel.className = 'w-[400px] bg-white border-r border-slate-200 z-30 flex flex-col shrink-0 transition-all duration-700 ease-in-out';
    }
  }

  const welcomeMessage = document.getElementById('welcome-message-wrapper');
  if (welcomeMessage) {
    welcomeMessage.remove();
  }

  // 1. Add User message bubble
  const userHtml = `
    <div class="flex w-full justify-end mb-3 animate-fade-in">
      <div class="flex max-w-[85%] flex-row-reverse items-end gap-2.5">
        <div class="flex flex-col items-end">
          <div class="px-4 py-2.5 text-xs leading-relaxed bg-slate-800 text-white rounded-[1.5rem] rounded-br-[0.5rem] shadow-[0_8px_20px_rgba(0,0,0,0.15)] border border-slate-700 markdown-body max-w-none">
            ${escapeHtml(text).replace(/\n/g, '<br/>')}
          </div>
          <span class="text-[10px] text-slate-400 mt-1 px-1">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>
    </div>
  `;
  container.insertAdjacentHTML('beforeend', userHtml);
  const scrollContainer = container.parentElement;
  if (scrollContainer) {
    scrollContainer.scrollTop = scrollContainer.scrollHeight;
  }

  // Clear input and reset height
  input.value = '';
  input.style.height = 'auto';

  // メッセージ送信の瞬間に、箱庭（中央パネル）に「Thinking...」のローディング表示を出すための処理
  // これにより、AIが推論中であることを視覚的にユーザーにフィードバックします
  if (projectId && typeof htmx !== 'undefined') {
    htmx.ajax('POST', `/${projectId}/action/simulate/reset-reactions`, {
      target: '#sandbox-characters',
      swap: 'outerHTML'
    });
  }

  // Check if text contains a URL and add system message
  const hasUrl = /(https?:\/\/[^\s]+)/g.test(text);
  if (hasUrl) {
    const systemHtml = `
      <div class="flex w-full justify-center mb-3 animate-fade-in">
        <div class="bg-slate-50/80 backdrop-blur-sm text-slate-500 text-[10px] font-bold px-4 py-1.5 rounded-full flex items-center shadow-[0_4px_15px_rgba(0,0,0,0.05)] border border-slate-200 uppercase tracking-wider">
          <svg class="w-3.5 h-3.5 mr-1.5 text-slate-400" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
          リソースに登録しました
        </div>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', systemHtml);

    // Show notification badge
    const badge = document.getElementById('resource-notification-badge');
    if (badge) badge.classList.remove('hidden');
  }

  // 2. Add empty Agent message bubble with loader
  const agentMsgId = 'agent-msg-' + Date.now();
  const agentHtml = `
    <div class="flex w-full justify-start mb-3 animate-fade-in" id="${agentMsgId}">
      <div class="flex max-w-[85%] flex-row items-end gap-2.5">
        <div class="w-8 h-8 rounded-[1rem] shrink-0 flex items-center justify-center bg-gradient-to-br from-orange-400 to-orange-500 text-white shadow-[0_4px_15px_rgba(249,115,22,0.3)] border border-orange-400/50">
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
        </div>
        <div class="flex flex-col items-start">
          <div class="px-4 py-2.5 text-xs leading-relaxed bg-white text-slate-700 border-2 border-slate-100 rounded-[1.5rem] rounded-bl-[0.5rem] shadow-[0_8px_30px_rgba(0,0,0,0.06)] markdown-body max-w-none">
            <span class="typing-loader text-slate-400">・・・</span>
          </div>
          <span class="text-[10px] text-slate-400 mt-1 px-1 time-label">Typing...</span>
        </div>
      </div>
    </div>
  `;
  container.insertAdjacentHTML('beforeend', agentHtml);
  if (scrollContainer) {
    scrollContainer.scrollTop = scrollContainer.scrollHeight;
  }

  try {
    const response = await fetch(`/${projectId}/action/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ inputText: text })
    });

    if (!response.ok) {
      throw new Error('Failed to get streaming response');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const contentDiv = document.querySelector(`#${agentMsgId} .markdown-body`);
    const timeLabel = document.querySelector(`#${agentMsgId} .time-label`);

    let incomingText = '';
    let displayedText = '';
    let isStreamDone = false;

    const typeInterval = setInterval(() => {
      const { cleanedText: textToRender } = parseAndCleanSystemActions(incomingText);

      if (displayedText.length < textToRender.length) {
        const diff = textToRender.length - displayedText.length;
        const charsToAppend = diff > 15 ? 4 : (diff > 5 ? 2 : 1);
        displayedText += textToRender.substr(displayedText.length, charsToAppend);

        if (window.marked && typeof window.marked.parse === 'function') {
          contentDiv.innerHTML = window.marked.parse(displayedText);
        } else {
          contentDiv.innerHTML = escapeHtml(displayedText).replace(/\n/g, '<br/>');
        }

        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
      } else if (isStreamDone) {
        clearInterval(typeInterval);
        timeLabel.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const { actions } = parseAndCleanSystemActions(incomingText);
        actions.forEach(action => {
          if (typeof action.onDetect === 'function') {
            action.onDetect();
          }

          const systemHtml = `
            <div class="flex w-full justify-center mb-4 animate-fade-in">
              <div class="bg-slate-50 text-slate-500 text-xs px-4 py-1.5 rounded-full flex items-center shadow-sm border border-slate-200">
                ${action.iconSvg}
                ${action.text}
              </div>
            </div>
          `;
          const chatContainer = document.getElementById('chat-messages-container');
          if (chatContainer) {
            chatContainer.insertAdjacentHTML('beforeend', systemHtml);
            const scrollParent = chatContainer.parentElement;
            if (scrollParent) {
              scrollParent.scrollTop = scrollParent.scrollHeight;
            }
          }
        });

        setTimeout(() => {
          if (typeof htmx !== 'undefined') {
            const t = Date.now();
            htmx.ajax('GET', `/${projectId}/view/chat?t=${t}`, { target: '#left-panel-content', swap: 'innerHTML' });
            htmx.ajax('GET', `/${projectId}/view/simulation-square?t=${t}`, { target: '#sandbox-characters', swap: 'outerHTML' });
            htmx.ajax('GET', `/${projectId}/view/topnav?t=${t}`, { target: '#topnav-header', swap: 'outerHTML' });
          }
        }, 1000);
      }
    }, 20);

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        isStreamDone = true;
        break;
      }
      const chunk = decoder.decode(value, { stream: true });
      incomingText += chunk;
    }

  } catch (error) {
    console.error('Error during streaming chat:', error);
    const contentDiv = document.querySelector(`#${agentMsgId} .markdown-body`);
    if (contentDiv) {
      contentDiv.innerHTML = `<span class="text-red-500">[エラーが発生しました: ${escapeHtml(error.message)}]</span>`;
    }
  }
};
