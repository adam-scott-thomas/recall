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

async function handleFiles(files) {
  for (const file of files) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);

    if (file.size > 500 * 1024 * 1024) {
      showStatus(`File too large (${sizeMB} MB). Maximum supported size is 500 MB.`, 'error');
      continue;
    }

    if (file.size > 100 * 1024 * 1024) {
      showStatus(`Large file (${sizeMB} MB). This may take a moment...`, '');
    } else {
      showStatus(`Reading ${file.name} (${sizeMB} MB)...`, '');
    }

    try {
      const text = await readFileWithProgress(file);
      showStatus(`Importing ${file.name}...`, '');

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
  importStatus.textContent = msg;
  importStatus.className = type || '';
  importStatus.style.display = 'block';
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
