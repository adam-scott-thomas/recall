// src/core/sniffer.js

// Signature definitions for each JSON-shaped format. Plain text / markdown /
// HTML are handled by filename extension + content heuristic, not signatures.
const SIGNATURES = {
  chatgpt_array: {
    required: ['mapping'],
    optional: ['title', 'create_time', 'update_time', 'conversation_id'],
    weight: 1.0,
  },
  chatgpt_single: {
    required: ['mapping'],
    optional: ['title', 'create_time', 'conversation_id'],
    weight: 0.9,
  },
  claude_array: {
    required: ['uuid', 'chat_messages'],
    optional: ['name', 'created_at', 'updated_at'],
    weight: 1.0,
  },
  claude_jsonl: {
    required: ['uuid', 'chat_messages'],
    optional: ['name', 'created_at'],
    weight: 0.9,
  },
};

const TEXT_EXTS = new Set(['txt']);
const MARKDOWN_EXTS = new Set(['md', 'markdown', 'mdown', 'mkd']);
const HTML_EXTS = new Set(['html', 'htm', 'xhtml']);

function _extensionOf(filename) {
  if (!filename || typeof filename !== 'string') return '';
  const idx = filename.lastIndexOf('.');
  if (idx < 0) return '';
  return filename.slice(idx + 1).toLowerCase();
}

function _looksLikeHtml(trimmed) {
  // Cheap prefix check for the common cases. Avoids false positives for JSON
  // strings that happen to contain '<'.
  return /^<!doctype\s+html/i.test(trimmed)
    || /^<html[\s>]/i.test(trimmed)
    || /^<\?xml/i.test(trimmed) && /<html[\s>]/i.test(trimmed);
}

function scoreSignature(obj, sig) {
  const keys = Object.keys(obj);
  const requiredHits = sig.required.filter(k => keys.includes(k)).length;
  if (requiredHits < sig.required.length) return 0;
  const optionalHits = sig.optional.filter(k => keys.includes(k)).length;
  const score = (requiredHits / sig.required.length) * 0.7 +
    (sig.optional.length > 0 ? (optionalHits / sig.optional.length) * 0.3 : 0.3);
  return score * sig.weight;
}

export function sniffFormat(textContent, filename = '') {
  if (!textContent || typeof textContent !== 'string') {
    return { format: 'unknown', confidence: 0 };
  }

  const trimmed = textContent.trim();
  const ext = _extensionOf(filename);

  // ---------- Pass 1: JSONL (Claude exports — newline-separated objects)
  const lines = trimmed.split('\n').filter(l => l.trim().startsWith('{'));
  if (lines.length >= 2) {
    try {
      const first = JSON.parse(lines[0]);
      const claudeScore = scoreSignature(first, SIGNATURES.claude_jsonl);
      if (claudeScore > 0.5) {
        return { format: 'claude_jsonl', confidence: claudeScore };
      }
    } catch { /* not JSONL */ }
  }

  // ---------- Pass 2: JSON (ChatGPT / Claude exports)
  let parsed;
  let jsonOk = false;
  try {
    parsed = JSON.parse(trimmed);
    jsonOk = true;
  } catch { /* fall through to text/markdown/html detection below */ }

  if (jsonOk) {
    if (Array.isArray(parsed) && parsed.length > 0) {
      const sample = parsed[0];
      if (typeof sample === 'object' && sample !== null) {
        let bestFormat = 'unknown';
        let bestScore = 0;

        const cgScore = scoreSignature(sample, SIGNATURES.chatgpt_array);
        if (cgScore > bestScore) { bestFormat = 'chatgpt_array'; bestScore = cgScore; }

        const clScore = scoreSignature(sample, SIGNATURES.claude_array);
        if (clScore > bestScore) { bestFormat = 'claude_array'; bestScore = clScore; }

        if (bestScore > 0) return { format: bestFormat, confidence: bestScore };
      }
    }

    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      const cgScore = scoreSignature(parsed, SIGNATURES.chatgpt_single);
      if (cgScore > 0.5) return { format: 'chatgpt_single', confidence: cgScore };

      const clScore = scoreSignature(parsed, SIGNATURES.claude_array);
      if (clScore > 0.5) return { format: 'claude_single', confidence: clScore };
    }

    // Valid JSON but no signature match — fall through to extension check
    // below; .json file with non-conversation contents is treated as unknown.
  }

  // ---------- Pass 3: filename-extension fallback for text/markdown/html
  if (TEXT_EXTS.has(ext)) {
    return { format: 'text', confidence: 0.95 };
  }
  if (MARKDOWN_EXTS.has(ext)) {
    return { format: 'markdown', confidence: 0.95 };
  }
  if (HTML_EXTS.has(ext)) {
    return { format: 'html', confidence: 0.95 };
  }

  // ---------- Pass 4: content heuristic for HTML when extension is missing
  if (_looksLikeHtml(trimmed)) {
    return { format: 'html', confidence: 0.7 };
  }

  return { format: 'unknown', confidence: 0 };
}
