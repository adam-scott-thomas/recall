// src/core/normalizer.js

const NORMALIZER_VERSION = 'norm_v1';

const INVISIBLE_CHARS = new Set([
  '\u200b', '\u200c', '\u200d', '\ufeff', '\u00ad', '\u2060', '\u180e',
  '\u200e', '\u200f', '\u202a', '\u202b', '\u202c', '\u202d', '\u202e',
  '\u2061', '\u2062', '\u2063', '\u2064',
]);

const GENERIC_TITLES = new Set([
  'untitled', 'new chat', 'new conversation',
  'untitled conversation', 'chat', 'conversation',
]);

const ROLE_MAP = {
  human: 'user', user: 'user', customer: 'user', person: 'user', me: 'user',
  assistant: 'assistant', ai: 'assistant', bot: 'assistant', claude: 'assistant',
  gpt: 'assistant', chatgpt: 'assistant', model: 'assistant', agent: 'assistant', llm: 'assistant',
  system: 'system', sys: 'system', context: 'system', instructions: 'system',
  tool: 'tool', function: 'tool', tool_use: 'tool', tool_result: 'tool',
  function_call: 'tool', function_result: 'tool',
};

export function normalizeText(text) {
  if (!text) return '';
  text = text.trim();
  if (!text) return '';
  text = text.normalize('NFC');
  text = [...text].filter(ch => !INVISIBLE_CHARS.has(ch)).join('');
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  text = text.replace(/\s+/g, ' ');
  text = text.trim().toLowerCase();
  return text;
}

export function normalizeTitle(title) {
  const norm = normalizeText(title);
  if (!norm || GENERIC_TITLES.has(norm)) return '';
  return norm.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
}

export function normalizeRole(role) {
  if (!role) return 'unknown';
  const key = role.toLowerCase().trim();
  return ROLE_MAP[key] || 'unknown';
}

let _sha256;

async function initSha256() {
  if (_sha256) return _sha256;
  if (typeof globalThis.crypto?.subtle !== 'undefined') {
    _sha256 = async (input) => {
      const encoded = new TextEncoder().encode(input);
      const buffer = await globalThis.crypto.subtle.digest('SHA-256', encoded);
      return Array.from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, '0')).join('');
    };
  } else {
    const { createHash } = await import('node:crypto');
    _sha256 = async (input) => createHash('sha256').update(input).digest('hex');
  }
  return _sha256;
}

export async function computeContentHash(role, text) {
  const hash = await initSha256();
  const input = `${NORMALIZER_VERSION}|${normalizeRole(role)}|${normalizeText(text)}`;
  return hash(input);
}
