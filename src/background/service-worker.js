// src/background/service-worker.js
import { sniffFormat } from '../core/sniffer.js';
import { parseExport } from '../core/parser.js';
import { createClassifier, classify } from '../core/classifier.js';
import { deduplicateMessages, deduplicateConversations } from '../core/dedup.js';
import { RecallStore } from '../core/store.js';
import { searchText, searchFuzzy, searchFirst, searchTimeline } from '../core/search.js';

const store = new RecallStore();
const classifier = createClassifier();
let storeReady = false;
let cachedMessages = null;

async function ensureStore() {
  if (!storeReady) { await store.open(); storeReady = true; }
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

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'import') handleImport(msg.data, msg.filename).then(sendResponse);
  if (msg.type === 'search') handleSearch(msg.query, msg.mode).then(sendResponse);
  if (msg.type === 'stats') handleStats().then(sendResponse);
  if (msg.type === 'export') handleExport().then(sendResponse);
  if (msg.type === 'deleteAll') handleDeleteAll().then(sendResponse);
  if (msg.type === 'getConversations') handleGetConversations().then(sendResponse);
  if (msg.type === 'getMessages') handleGetMessages(msg.conversationId).then(sendResponse);
  return true; // keep channel open for async
});

async function handleImport(rawText, filename) {
  try {
    await ensureStore();
    const { format, confidence } = sniffFormat(rawText);
    if (format === 'unknown' || confidence < 0.5) {
      return { error: 'Unrecognized format. Please upload a ChatGPT or Claude export file.' };
    }

    const { conversations, messages } = await parseExport(rawText, format);

    // Classify each conversation
    for (const conv of conversations) {
      const allText = messages
        .filter(m => m.conversationId === conv.conversationId)
        .map(m => m.text).join(' ');
      const domains = classify(classifier, allText);
      conv.domain = domains.length > 0 ? domains[0][0] : 'general';
      conv.domainScore = domains.length > 0 ? domains[0][1] : 0;
      conv.sourceFile = filename;
    }

    // Deduplicate
    const dedupedConvs = deduplicateConversations(conversations);
    const dedupedMsgs = deduplicateMessages(messages);

    // Store
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
  } catch (err) {
    return { error: err.message };
  }
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
  cachedMessages = null; // invalidate enriched cache
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
