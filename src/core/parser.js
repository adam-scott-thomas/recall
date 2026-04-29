// src/core/parser.js
// Port of streaming_parser.py — parses ChatGPT and Claude conversation exports.

import { normalizeRole, computeContentHash } from './normalizer.js';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * BFS from root nodes (nodes whose parent is null or whose parent ID is not
 * present in the mapping).  Returns node IDs in traversal order.
 *
 * @param {Record<string, {id: string, parent: string|null, children: string[]}>} mapping
 * @returns {string[]}
 */
function _walkMappingGraph(mapping) {
  const ids = Object.keys(mapping);
  const idSet = new Set(ids);

  // Root nodes: no parent, or parent not in the mapping
  const roots = ids.filter(id => {
    const node = mapping[id];
    return node.parent == null || !idSet.has(node.parent);
  });

  const visited = new Set();
  const order = [];
  const queue = [...roots];

  while (queue.length > 0) {
    const nodeId = queue.shift();
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);
    order.push(nodeId);

    const node = mapping[nodeId];
    if (node && Array.isArray(node.children)) {
      for (const childId of node.children) {
        if (!visited.has(childId)) {
          queue.push(childId);
        }
      }
    }
  }

  // Append any nodes not yet visited (disconnected nodes)
  for (const id of ids) {
    if (!visited.has(id)) {
      order.push(id);
    }
  }

  return order;
}

/**
 * Filter for strings from a ChatGPT content.parts array and join with newline.
 *
 * @param {unknown[]} parts
 * @returns {string}
 */
function _extractTextFromParts(parts) {
  if (!Array.isArray(parts)) return '';
  return parts
    .filter(p => typeof p === 'string')
    .join('\n');
}

/**
 * Generate a UUID for messages/conversations missing an ID in the export.
 *
 * @returns {string}
 */
function _generateId() {
  // crypto.randomUUID() is available in all MV3 contexts (popup, options, SW).
  return globalThis.crypto.randomUUID();
}

// ---------------------------------------------------------------------------
// ChatGPT flattener
// ---------------------------------------------------------------------------

/**
 * Flatten a single ChatGPT conversation object.
 *
 * @param {object} rawConv  One element from a chatgpt_array export
 * @returns {Promise<{conversation: object, messages: object[]}>}
 */
async function flattenChatGPT(rawConv) {
  const conversationId = rawConv.conversation_id || rawConv.id || _generateId();
  // Store raw title for display; normalizeTitle() is lowercase/stripped so only
  // useful for dedup — use raw value as the human-readable title.
  const title = rawConv.title || '';
  const createTime = rawConv.create_time ?? null;
  const updateTime = rawConv.update_time ?? null;

  const mapping = rawConv.mapping || {};
  const nodeOrder = _walkMappingGraph(mapping);

  const messages = [];

  for (const nodeId of nodeOrder) {
    const node = mapping[nodeId];
    if (!node) continue;

    const msg = node.message;
    // Skip null messages (root nodes) and system messages
    if (!msg) continue;

    const role = normalizeRole(msg.author?.role ?? '');
    if (role === 'system') continue;

    const parts = msg.content?.parts ?? [];
    const rawText = _extractTextFromParts(parts);
    const text = rawText; // store raw; normalizeText used only for hash

    const timestamp = typeof msg.create_time === 'number' ? msg.create_time : null;
    const modelSlug = msg.metadata?.model_slug ?? null;
    const messageId = msg.id || nodeId;
    const parentId = node.parent ?? null;

    const contentHash = await computeContentHash(role, rawText);

    messages.push({
      messageId,
      conversationId,
      role,
      text,
      contentHash,
      timestamp,
      wordCount: text.trim() ? text.trim().split(/\s+/).length : 0,
      charCount: text.length,
      modelSlug,
      parentId,
    });
  }

  // Derive conversation-level stats from messages
  const timestamps = messages.map(m => m.timestamp).filter(t => t !== null);
  const firstMessageTime = timestamps.length ? Math.min(...timestamps) : null;
  const lastMessageTime = timestamps.length ? Math.max(...timestamps) : null;

  const modelSlugsSet = new Set(
    messages.map(m => m.modelSlug).filter(Boolean)
  );

  // Conversation content hash: hash of all message hashes concatenated
  const combinedHashes = messages.map(m => m.contentHash).join('');
  const convContentHash = await computeContentHash('conversation', combinedHashes);

  const conversation = {
    conversationId,
    title,
    createTime,
    updateTime,
    messageCount: messages.length,
    firstMessageTime,
    lastMessageTime,
    modelSlugs: Array.from(modelSlugsSet),
    contentHash: convContentHash,
  };

  return { conversation, messages };
}

// ---------------------------------------------------------------------------
// Claude flattener
// ---------------------------------------------------------------------------

/**
 * Flatten a single Claude conversation object.
 *
 * @param {object} rawConv  One element from a claude_array export
 * @returns {Promise<{conversation: object, messages: object[]}>}
 */
async function flattenClaude(rawConv) {
  const conversationId = rawConv.uuid || rawConv.id || _generateId();
  // Store raw name for display; normalizeTitle() lowercases, so keep original.
  const title = rawConv.name || '';

  // Claude timestamps are ISO strings
  const parseIso = (s) => s ? Math.floor(Date.parse(s) / 1000) : null;

  const createTime = parseIso(rawConv.created_at);
  const updateTime = parseIso(rawConv.updated_at);

  const chatMessages = rawConv.chat_messages || rawConv.messages || [];
  const messages = [];

  for (const msg of chatMessages) {
    const role = normalizeRole(msg.sender ?? msg.role ?? '');
    const rawText = msg.text ?? msg.content ?? '';
    const text = rawText;

    const timestamp = parseIso(msg.created_at);
    const messageId = msg.uuid || msg.id || _generateId();
    const parentId = msg.parent_uuid ?? msg.parent_id ?? null;

    const contentHash = await computeContentHash(role, rawText);

    messages.push({
      messageId,
      conversationId,
      role,
      text,
      contentHash,
      timestamp,
      wordCount: text.trim() ? text.trim().split(/\s+/).length : 0,
      charCount: text.length,
      modelSlug: msg.model ?? null,
      parentId,
    });
  }

  const timestamps = messages.map(m => m.timestamp).filter(t => t !== null);
  const firstMessageTime = timestamps.length ? Math.min(...timestamps) : null;
  const lastMessageTime = timestamps.length ? Math.max(...timestamps) : null;

  const modelSlugsSet = new Set(
    messages.map(m => m.modelSlug).filter(Boolean)
  );

  const combinedHashes = messages.map(m => m.contentHash).join('');
  const convContentHash = await computeContentHash('conversation', combinedHashes);

  const conversation = {
    conversationId,
    title,
    createTime,
    updateTime,
    messageCount: messages.length,
    firstMessageTime,
    lastMessageTime,
    modelSlugs: Array.from(modelSlugsSet),
    contentHash: convContentHash,
  };

  return { conversation, messages };
}

// ---------------------------------------------------------------------------
// Document flatteners (text / markdown / html)
// ---------------------------------------------------------------------------

/**
 * Strip HTML tags and decode common entities to plain text.
 * Uses DOMParser when available (Window/Worker contexts including MV3 SW),
 * with a regex fallback for safety.
 *
 * @param {string} html
 * @returns {{text: string, title: string}}
 */
function _htmlToText(html) {
  let text = '';
  let title = '';

  try {
    if (typeof DOMParser !== 'undefined') {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      title = doc.querySelector('title')?.textContent?.trim() ?? '';
      // Drop script/style/noscript content from the text body.
      doc.querySelectorAll('script, style, noscript').forEach(el => el.remove());
      text = (doc.body?.textContent ?? doc.documentElement?.textContent ?? '').trim();
    }
  } catch { /* fall through to regex strip */ }

  if (!text) {
    // Regex fallback — sufficient for malformed HTML or contexts without DOMParser.
    const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
    if (titleMatch) title = titleMatch[1].trim();
    text = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  return { text, title };
}

/**
 * Extract a title from a markdown body — first ATX heading, fallback to
 * first non-empty line if it's short enough to look like a title.
 *
 * @param {string} md
 * @returns {string}
 */
function _markdownTitle(md) {
  for (const raw of md.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const heading = /^#{1,6}\s+(.+?)\s*#*\s*$/.exec(line);
    if (heading) return heading[1];
    // First non-empty line, only if it reads like a title.
    return line.length <= 120 ? line : '';
  }
  return '';
}

/**
 * Strip a filename of its extension for use as a fallback title.
 *
 * @param {string} filename
 * @returns {string}
 */
function _titleFromFilename(filename) {
  if (!filename) return '';
  const base = filename.replace(/^.*[\\/]/, '');
  const idx = base.lastIndexOf('.');
  return idx > 0 ? base.slice(0, idx) : base;
}

/**
 * Flatten a plain document (text/markdown/html) into a single-message
 * conversation. The whole file body becomes one user-role message; the
 * conversation title is derived from the document title where available,
 * otherwise the filename.
 *
 * @param {string} body
 * @param {string} filename
 * @param {'text'|'markdown'|'html'} format
 * @returns {Promise<{conversation: object, messages: object[]}>}
 */
async function flattenDocument(body, filename, format) {
  let text = body;
  let derivedTitle = '';

  if (format === 'html') {
    const { text: stripped, title } = _htmlToText(body);
    text = stripped;
    derivedTitle = title;
  } else if (format === 'markdown') {
    derivedTitle = _markdownTitle(body);
  }

  const title = derivedTitle || _titleFromFilename(filename) || 'Untitled document';
  const conversationId = _generateId();
  const messageId = _generateId();
  const now = Math.floor(Date.now() / 1000);

  const role = 'user';
  const contentHash = await computeContentHash(role, text);

  const message = {
    messageId,
    conversationId,
    role,
    text,
    contentHash,
    timestamp: now,
    wordCount: text.trim() ? text.trim().split(/\s+/).length : 0,
    charCount: text.length,
    modelSlug: null,
    parentId: null,
  };

  const convContentHash = await computeContentHash('conversation', contentHash);

  const conversation = {
    conversationId,
    title,
    createTime: now,
    updateTime: now,
    messageCount: 1,
    firstMessageTime: now,
    lastMessageTime: now,
    modelSlugs: [],
    contentHash: convContentHash,
    sourceFormat: format, // 'text' | 'markdown' | 'html'
  };

  return { conversation, messages: [message] };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/**
 * Parse a raw export string into normalized conversations and messages.
 * Supports every format the sniffer recognizes:
 *   - Conversation exports: chatgpt_array, chatgpt_single, claude_array,
 *     claude_single, claude_jsonl
 *   - Plain documents: text, markdown, html
 *
 * Plain documents become one-conversation, one-message records.
 *
 * @param {string} rawText  The raw export file body
 * @param {'chatgpt_array'|'chatgpt_single'|'claude_array'|'claude_single'|'claude_jsonl'|'text'|'markdown'|'html'} format
 * @param {string} [filename]  Original filename — used as a title fallback for documents
 * @returns {Promise<{conversations: object[], messages: object[]}>}
 */
export async function parseExport(rawText, format, filename = '') {
  // ----- Plain document formats: one file = one conversation
  if (format === 'text' || format === 'markdown' || format === 'html') {
    const result = await flattenDocument(rawText, filename, format);
    return {
      conversations: [result.conversation],
      messages: result.messages,
    };
  }

  // ----- Conversation export formats
  let rawConversations;
  let flavor; // 'chatgpt' | 'claude'

  if (format === 'claude_jsonl') {
    rawConversations = rawText
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => JSON.parse(line));
    flavor = 'claude';
  } else if (format === 'chatgpt_array' || format === 'chatgpt_single') {
    const parsed = JSON.parse(rawText);
    rawConversations = Array.isArray(parsed) ? parsed : [parsed];
    flavor = 'chatgpt';
  } else if (format === 'claude_array' || format === 'claude_single') {
    const parsed = JSON.parse(rawText);
    rawConversations = Array.isArray(parsed) ? parsed : [parsed];
    flavor = 'claude';
  } else {
    throw new Error(`Unsupported format: ${format}`);
  }

  const allConversations = [];
  const allMessages = [];

  for (const rawConv of rawConversations) {
    const result = flavor === 'chatgpt'
      ? await flattenChatGPT(rawConv)
      : await flattenClaude(rawConv);

    allConversations.push(result.conversation);
    allMessages.push(...result.messages);
  }

  return {
    conversations: allConversations,
    messages: allMessages,
  };
}
