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

function submitSuggestion(element) {
  const text = element.getAttribute('data-text');
  const input = document.getElementById('inputText');
  if (input && text) {
    input.value = text;
    const form = input.closest('form');
    if (form) {
      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    }
  }
}

// 新規プロジェクト作成時のメッセージ自動送信トリガー
function triggerPendingStreamChat() {
  const pendingText = sessionStorage.getItem('pendingStreamText');
  const pendingModel = sessionStorage.getItem('pendingStreamModel');
  if (pendingText) {
    const input = document.getElementById('inputText');
    const modelSelect = document.getElementById('modelSelect');
    if (input) {
      // 確実に要素が見つかった段階でセッションを消去
      sessionStorage.removeItem('pendingStreamText');
      sessionStorage.removeItem('pendingStreamModel');
      
      input.value = pendingText;
      if (modelSelect && pendingModel) modelSelect.value = pendingModel;
      const form = input.closest('form');
      if (form) {
        // HTMXやカスタムイベントに対応するため、少し遅延させてサブミット
        setTimeout(() => {
          form.requestSubmit();
        }, 100);
      }
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  triggerPendingStreamChat();
});

// 非同期でチャット画面がロードされた際（HTMX swap完了時）にトリガー
document.body.addEventListener('htmx:afterSwap', (evt) => {
  if (evt.detail.target && evt.detail.target.id === 'left-panel-content') {
    triggerPendingStreamChat();
  }
});

async function submitStreamChat(event) {
  event.preventDefault();

  const input = document.getElementById('inputText');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;

  const modelSelect = document.getElementById('modelSelect');
  const model = modelSelect ? modelSelect.value : 'gemini-2.5-flash';

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
    <div class="flex w-full justify-end mb-4 animate-fade-in">
      <div class="flex max-w-[85%] flex-row-reverse items-end gap-3">
        <div class="w-8 h-8 rounded-full shrink-0 flex items-center justify-center bg-slate-800 text-white shadow-md">
          <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
        </div>
        <div class="flex flex-col items-end">
          <div class="px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm bg-slate-800 text-white rounded-br-sm">
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
  const projectId = window.currentProjectId;
  if (projectId) {
    fetch(`/${projectId}/action/simulate/reset-reactions`, { method: 'POST' })
      .then(res => res.text())
      .then(html => {
        const sandbox = document.getElementById('sandbox-characters');
        if (sandbox && html) {
          sandbox.innerHTML = html;
          if (typeof htmx !== 'undefined') {
            htmx.process(sandbox); // Ensure htmx processes the new sandbox elements
          }
        }
      })
      .catch(err => console.error('Failed to trigger reset reactions:', err));
  }

  // Check if text contains a URL and add system message
  const hasUrl = /(https?:\/\/[^\s]+)/g.test(text);
  if (hasUrl) {
    const systemHtml = `
      <div class="flex w-full justify-center mb-4 animate-fade-in">
        <div class="bg-slate-50 text-slate-500 text-xs px-4 py-1.5 rounded-full flex items-center shadow-sm border border-slate-200">
          <svg class="w-3.5 h-3.5 mr-1.5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
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
    <div class="flex w-full justify-start mb-4 animate-fade-in" id="${agentMsgId}">
      <div class="flex max-w-[85%] flex-row items-end gap-3">
        <div class="w-8 h-8 rounded-full shrink-0 flex items-center justify-center bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-md">
          <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
        </div>
        <div class="flex flex-col items-start">
          <div class="px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm bg-white text-slate-700 border border-slate-200 rounded-bl-sm markdown-body prose prose-sm max-w-none">
            <span class="typing-loader text-slate-400">●●●</span>
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
      body: JSON.stringify({ inputText: text, model })
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

    // Typewriter loop for smooth streaming rendering and automatic scrolling
    const typeInterval = setInterval(() => {
      if (displayedText.length < incomingText.length) {
        const diff = incomingText.length - displayedText.length;
        const charsToAppend = diff > 15 ? 4 : (diff > 5 ? 2 : 1);
        displayedText += incomingText.substr(displayedText.length, charsToAppend);

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
        setTimeout(() => {
          window.location.reload();
        }, 500);
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
}
