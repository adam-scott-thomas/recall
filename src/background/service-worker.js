// src/background/service-worker.js
import { sniffFormat } from '../core/sniffer.js';
import { parseExport } from '../core/parser.js';
import { createClassifier, classify } from '../core/classifier.js';
import { deduplicateMessages, deduplicateConversations } from '../core/dedup.js';
import { RecallStore } from '../core/store.js';

const store = new RecallStore();
const classifier = createClassifier();
let storeReady = false;

async function ensureStore() {
  if (!storeReady) { await store.open(); storeReady = true; }
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
  await ensureStore();
  if (mode === 'text') return store.searchText(query);
  // For other modes, load all messages and use search module
  // (v1 simplification: all modes go through store.searchText)
  return store.searchText(query);
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
