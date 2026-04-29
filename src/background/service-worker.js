// src/background/service-worker.js
import { sniffFormat } from '../core/sniffer.js';
import { parseExport } from '../core/parser.js';
import { createClassifier, classify } from '../core/classifier.js';
import { deduplicateMessages, deduplicateConversations } from '../core/dedup.js';
import { RecallStore } from '../core/store.js';
import { searchText, searchFuzzy, searchFirst, searchTimeline } from '../core/search.js';

const store = new RecallStore();
const classifier = createClassifier();
let _openPromise = null;
let cachedMessages = null;

// Single-flight: concurrent first-touch messages all await the same open()
// promise instead of racing each other into IndexedDB.
async function ensureStore() {
  if (!_openPromise) _openPromise = store.open();
  return _openPromise;
}

async function getEnrichedMessages() {
  if (cachedMessages) return cachedMessages;
  await ensureStore();
  const messages = await store.getAllMessages();
  const conversations = await store.getAllConversations();
  const convMap = new Map(conversations.map(c => [c.conversationId, c]));
  cachedMessages = messages.map(msg => ({
    ...msg,
    convTitle: convMap.get(msg.conversationId)?.title || '',
  }));
  return cachedMessages;
}

// Wrap a handler so any thrown error becomes a structured response instead of
// a silent undefined that leaves the popup spinning forever.
function wrap(fn) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (err) {
      console.error('[recall] handler error:', err);
      return { error: err?.message || String(err) };
    }
  };
}

const handlers = {
  import: wrap(handleImport),
  search: wrap(handleSearch),
  stats: wrap(handleStats),
  export: wrap(handleExport),
  deleteAll: wrap(handleDeleteAll),
  getConversations: wrap(handleGetConversations),
  getMessages: wrap(handleGetMessages),
};

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const handler = handlers[msg.type];
  if (!handler) return false;

  // Dispatch with the right argument shape per message type.
  const dispatch = {
    import: () => handler(msg.data, msg.filename),
    search: () => handler(msg.query, msg.mode),
    stats: () => handler(),
    export: () => handler(),
    deleteAll: () => handler(),
    getConversations: () => handler(),
    getMessages: () => handler(msg.conversationId),
  }[msg.type];

  dispatch().then(sendResponse);
  return true; // keep the channel open for async response
});

async function handleImport(rawText, filename) {
  await ensureStore();
  const { format, confidence } = sniffFormat(rawText, filename);
  if (format === 'unknown' || confidence < 0.5) {
    return { error: 'Unrecognized format. Recall accepts ChatGPT/Claude exports (.json, .jsonl) and plain documents (.txt, .md, .html).' };
  }

  const { conversations, messages } = await parseExport(rawText, format, filename);

  // Build conv → messages map once instead of filtering N times inside the loop.
  // For a 1k-conv / 50k-msg export this turns ~50M iterations into ~50K.
  const msgsByConv = new Map();
  for (const m of messages) {
    let bucket = msgsByConv.get(m.conversationId);
    if (!bucket) { bucket = []; msgsByConv.set(m.conversationId, bucket); }
    bucket.push(m);
  }

  for (const conv of conversations) {
    const convMsgs = msgsByConv.get(conv.conversationId) || [];
    const allText = convMsgs.map(m => m.text).join(' ');
    const domains = classify(classifier, allText);
    conv.domain = domains.length > 0 ? domains[0][0] : 'general';
    conv.domainScore = domains.length > 0 ? domains[0][1] : 0;
    conv.sourceFile = filename;
  }

  // Deduplicate
  const dedupedConvs = deduplicateConversations(conversations);
  const dedupedMsgs = deduplicateMessages(messages);

  await store.putConversations(dedupedConvs);
  await store.putMessages(dedupedMsgs);
  cachedMessages = null; // invalidate enriched cache

  return {
    imported: dedupedConvs.length,
    messages: dedupedMsgs.length,
    skippedConvs: conversations.length - dedupedConvs.length,
    skippedMsgs: messages.length - dedupedMsgs.length,
    format,
  };
}

async function handleSearch(query, mode = 'text') {
  const messages = await getEnrichedMessages();
  switch (mode) {
    case 'fuzzy':
      return searchFuzzy(messages, query);
    case 'first': {
      const result = searchFirst(messages, query);
      return result ? [result] : [];
    }
    case 'timeline':
      return searchTimeline(messages, query);
    case 'text':
    default:
      return searchText(messages, query);
  }
}

async function handleStats() {
  await ensureStore();
  return store.getStats();
}

async function handleExport() {
  await ensureStore();
  return store.exportAll();
}

async function handleDeleteAll() {
  await ensureStore();
  await store.deleteAll();
  cachedMessages = null;
  return { success: true };
}

async function handleGetConversations() {
  await ensureStore();
  return store.getAllConversations();
}

async function handleGetMessages(conversationId) {
  await ensureStore();
  return store.getMessagesByConversation(conversationId);
}
