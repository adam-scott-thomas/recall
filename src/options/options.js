// src/options/options.js

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const chooseFileBtn = document.getElementById('choose-file');
const importStatus = document.getElementById('import-status');
const convCount = document.getElementById('conv-count');
const msgCount = document.getElementById('msg-count');
const exportBtn = document.getElementById('export-btn');
const deleteBtn = document.getElementById('delete-btn');
const confirmDialog = document.getElementById('confirm-delete');
const confirmYes = document.getElementById('confirm-yes');
const confirmNo = document.getElementById('confirm-no');
const openSearchBtn = document.getElementById('open-search-btn');

openSearchBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('src/popup/popup.html') + '?view=tab' });
});

// Load stats
function loadStats() {
  chrome.runtime.sendMessage({ type: 'stats' }, (stats) => {
    if (stats) {
      convCount.textContent = stats.conversationCount;
      msgCount.textContent = stats.messageCount;
    }
  });
}
loadStats();

// File selection
chooseFileBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => {
  if (fileInput.files.length > 0) handleFiles(fileInput.files);
});

// Drag and drop
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
});

// chrome.runtime.sendMessage caps payloads at 64 MiB. We read the full file
// into a string and ship it to the service worker, so cap below that with
// headroom for JSON serialization overhead.
const MAX_IMPORT_BYTES = 25 * 1024 * 1024; // 25 MB

async function handleFiles(files) {
  for (const file of files) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);

    if (file.size > MAX_IMPORT_BYTES) {
      showStatus(`File too large (${sizeMB} MB). Maximum supported size is 25 MB. For larger exports, split the file or open an issue.`, 'error');
      continue;
    }

    if (file.size > 10 * 1024 * 1024) {
      showStatus(`Large file (${sizeMB} MB). This may take a moment...`, '');
    } else {
      showStatus(`Reading ${file.name} (${sizeMB} MB)...`, '');
    }

    try {
      const text = await readFileWithProgress(file);
      showStatus(`Importing ${file.name}...`, 'loading');

      chrome.runtime.sendMessage({ type: 'import', data: text, filename: file.name }, (result) => {
        if (result && result.error) {
          showStatus(result.error, 'error');
        } else if (result) {
          showStatus(
            `Imported ${result.imported} conversations (${result.messages} messages). ` +
            `${result.skippedConvs} duplicate conversations skipped. Format: ${result.format}`,
            'success'
          );
          loadStats();
        }
      });
    } catch (err) {
      showStatus(`Error reading file: ${err.message}`, 'error');
    }
  }
}

function readFileWithProgress(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        showStatus(`Reading ${file.name}... ${pct}%`, '');
      }
    };

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function showStatus(msg, type) {
  const spinner = type === 'loading' ? '<span class="spinner"></span>' : '';
  importStatus.innerHTML = spinner + escapeHtml(msg);
  importStatus.className = type === 'loading' ? '' : (type || '');
  importStatus.style.display = 'block';
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Export
exportBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'export' }, (data) => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recall-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });
});

// Delete
deleteBtn.addEventListener('click', () => {
  confirmDialog.classList.add('visible');
});

confirmNo.addEventListener('click', () => {
  confirmDialog.classList.remove('visible');
});

confirmYes.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'deleteAll' }, () => {
    confirmDialog.classList.remove('visible');
    loadStats();
    showStatus('All data deleted.', 'success');
  });
});
