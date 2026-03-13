// src/core/sniffer.js

// Signature definitions for each format
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

function scoreSignature(obj, sig) {
  const keys = Object.keys(obj);
  const requiredHits = sig.required.filter(k => keys.includes(k)).length;
  if (requiredHits < sig.required.length) return 0;
  const optionalHits = sig.optional.filter(k => keys.includes(k)).length;
  const score = (requiredHits / sig.required.length) * 0.7 +
    (sig.optional.length > 0 ? (optionalHits / sig.optional.length) * 0.3 : 0.3);
  return score * sig.weight;
}

export function sniffFormat(textContent) {
  if (!textContent || typeof textContent !== 'string') {
    return { format: 'unknown', confidence: 0 };
  }

  const trimmed = textContent.trim();

  // Check JSONL first (multiple lines starting with {)
  const lines = trimmed.split('\n').filter(l => l.trim().startsWith('{'));
  if (lines.length >= 2) {
    try {
      const first = JSON.parse(lines[0]);
      // Score against JSONL signatures
      const claudeScore = scoreSignature(first, SIGNATURES.claude_jsonl);
      if (claudeScore > 0.5) {
        return { format: 'claude_jsonl', confidence: claudeScore };
      }
    } catch { /* not JSONL */ }
  }

  // Try JSON parse
  let parsed;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { format: 'unknown', confidence: 0 };
  }

  // Array format
  if (Array.isArray(parsed) && parsed.length > 0) {
    const sample = parsed[0];
    if (typeof sample !== 'object' || sample === null) {
      return { format: 'unknown', confidence: 0 };
    }

    let bestFormat = 'unknown';
    let bestScore = 0;

    // Test ChatGPT array
    const cgScore = scoreSignature(sample, SIGNATURES.chatgpt_array);
    if (cgScore > bestScore) { bestFormat = 'chatgpt_array'; bestScore = cgScore; }

    // Test Claude array
    const clScore = scoreSignature(sample, SIGNATURES.claude_array);
    if (clScore > bestScore) { bestFormat = 'claude_array'; bestScore = clScore; }

    return bestScore > 0 ? { format: bestFormat, confidence: bestScore } : { format: 'unknown', confidence: 0 };
  }

  // Single object format
  if (typeof parsed === 'object' && parsed !== null) {
    const cgScore = scoreSignature(parsed, SIGNATURES.chatgpt_single);
    if (cgScore > 0.5) return { format: 'chatgpt_single', confidence: cgScore };

    const clScore = scoreSignature(parsed, SIGNATURES.claude_array);
    if (clScore > 0.5) return { format: 'claude_single', confidence: clScore };
  }

  return { format: 'unknown', confidence: 0 };
}
