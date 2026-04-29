// src/popup/popup.js

if (new URLSearchParams(location.search).get('view') === 'tab') {
  document.body.classList.add('tab-view');
}

const searchInput = document.getElementById('search-input');
const resultsContainer = document.getElementById('results');
const statsEl = document.getElementById('stats');
const openOptionsLink = document.getElementById('open-options');
const modeButtons = document.querySelectorAll('.mode-btn');

let currentMode = 'text';
let debounceTimer = null;

// Load stats on open
chrome.runtime.sendMessage({ type: 'stats' }, (stats) => {
  if (stats) {
    statsEl.textContent = `${stats.conversationCount} conversations, ${stats.messageCount} messages`;
  } else {
    statsEl.textContent = 'No data yet — import conversations first';
  }
});

// On load, show recent conversations
loadConversations();

// Mode toggle
modeButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    modeButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentMode = btn.dataset.mode;
    doSearch();
  });
});

// Search with debounce
searchInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(doSearch, 300);
});

// Open options
openOptionsLink.addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

function doSearch() {
  const query = searchInput.value.trim();
  if (!query) {
    loadConversations();
    return;
  }

  chrome.runtime.sendMessage({ type: 'search', query, mode: currentMode }, (results) => {
    if (!results || results.length === 0) {
      resultsContainer.innerHTML = '<div class="no-results">No results found</div>';
      return;
    }
    renderResults(results, query);
  });
}

function loadConversations() {
  chrome.runtime.sendMessage({ type: 'getConversations' }, (convs) => {
    if (!convs || convs.length === 0) {
      resultsContainer.innerHTML = '<div class="no-results">No conversations yet. Import from settings.</div>';
      return;
    }
    // Sort by most recent
    convs.sort((a, b) => (b.updateTime || b.createTime || 0) - (a.updateTime || a.createTime || 0));
    renderConversationList(convs.slice(0, 50));
  });
}

function renderConversationList(convs) {
  resultsContainer.innerHTML = convs.map(conv => {
    const convId = escapeHtml(conv.conversationId || '');
    const domain = conv.domain ? `<span class="domain-badge">${escapeHtml(conv.domain)}</span>` : '';
    const title = escapeHtml(conv.title || 'Untitled');
    const count = escapeHtml(String(conv.messageCount ?? '?'));
    const time = conv.createTime ? ' · ' + escapeHtml(formatTime(conv.createTime)) : '';
    return `
      <div class="result-card conv-card" data-conv-id="${convId}">
        <div class="result-meta">
          ${domain}
          <span class="conv-title">${title}</span>
        </div>
        <div class="result-time">${count} messages${time}</div>
      </div>
    `;
  }).join('');
}

function renderResults(results, query) {
  resultsContainer.innerHTML = results.map(msg => {
    const snippet = highlightMatch(msg.text || '', query);
    const time = msg.timestamp ? escapeHtml(formatTime(msg.timestamp)) : '';
    const role = escapeHtml(msg.role || 'unknown');
    const title = msg.convTitle || msg.conversationId || '';
    const convId = escapeHtml(msg.conversationId || '');
    const msgId = escapeHtml(msg.messageId || '');

    return `
      <div class="result-card" data-conv-id="${convId}" data-msg-id="${msgId}">
        <div class="result-meta">
          <span class="role-badge ${role}">${role}</span>
          <span class="conv-title">${escapeHtml(title)}</span>
        </div>
        <div class="result-text">${snippet}</div>
        <div class="result-time">${time}</div>
      </div>
    `;
  }).join('');
}

// Click delegation on results container
resultsContainer.addEventListener('click', (e) => {
  const card = e.target.closest('.result-card');
  if (!card) return;
  const convId = card.dataset.convId;
  const msgId = card.dataset.msgId;
  if (convId) showConversation(convId, msgId);
});

// Back button handler
document.getElementById('back-btn').addEventListener('click', () => {
  document.getElementById('conversation-view').style.display = 'none';
  document.querySelector('header').style.display = 'block';
  resultsContainer.style.display = 'block';
  document.querySelector('footer').style.display = 'flex';
});

function showConversation(convId, highlightMsgId) {
  // Hide search, show conversation
  document.querySelector('header').style.display = 'none';
  resultsContainer.style.display = 'none';
  document.querySelector('footer').style.display = 'none';
  document.getElementById('conversation-view').style.display = 'flex';

  chrome.runtime.sendMessage({ type: 'getMessages', conversationId: convId }, (messages) => {
    chrome.runtime.sendMessage({ type: 'getConversations' }, (convs) => {
      const conv = convs?.find(c => c.conversationId === convId);
      document.getElementById('conv-title-display').textContent = conv?.title || convId;

      const container = document.getElementById('conv-messages');
      if (!messages || messages.length === 0) {
        container.innerHTML = '<div class="no-results">No messages found</div>';
        return;
      }

      // Sort by timestamp
      messages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

      container.innerHTML = messages.map(msg => {
        const role = escapeHtml(msg.role || 'unknown');
        const msgId = escapeHtml(msg.messageId || '');
        const isHighlighted = msg.messageId === highlightMsgId;
        return `
          <div class="message-bubble ${role} ${isHighlighted ? 'highlighted' : ''}"
               id="msg-${msgId}">
            <div class="message-role">${role}</div>
            <div>${escapeHtml(msg.text || '')}</div>
          </div>
        `;
      }).join('');

      // Scroll to highlighted message — querySelector with attribute match
      // avoids issues if escapeHtml-safe IDs contain CSS-special characters.
      if (highlightMsgId) {
        const el = container.querySelector(`[id="msg-${CSS.escape(highlightMsgId)}"]`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  });
}

function highlightMatch(text, query) {
  const escaped = escapeHtml(text);
  if (!query) return escaped;
  const re = new RegExp(`(${escapeRegExp(query)})`, 'gi');
  return escaped.replace(re, '<mark>$1</mark>');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatTime(ts) {
  const date = new Date(ts * 1000);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString();
}
