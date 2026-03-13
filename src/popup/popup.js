// src/popup/popup.js

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
    resultsContainer.innerHTML = '<div class="no-results">Type to search your conversations</div>';
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

function renderResults(results, query) {
  resultsContainer.innerHTML = results.map(msg => {
    const snippet = highlightMatch(msg.text || '', query);
    const time = msg.timestamp ? formatTime(msg.timestamp) : '';
    const role = msg.role || 'unknown';
    const title = msg.convTitle || msg.conversationId || '';

    return `
      <div class="result-card" data-conv-id="${msg.conversationId}" data-msg-id="${msg.messageId}">
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

function highlightMatch(text, query) {
  const escaped = escapeHtml(text);
  if (!query) return escaped;
  const re = new RegExp(`(${escapeRegExp(query)})`, 'gi');
  return escaped.replace(re, '<mark>$1</mark>');
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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
