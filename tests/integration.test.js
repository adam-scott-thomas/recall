// tests/integration.test.js
// End-to-end integration test: file → sniffer → parser → classifier → dedup → store → search
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import 'fake-indexeddb/auto';

import { sniffFormat } from '../src/core/sniffer.js';
import { parseExport } from '../src/core/parser.js';
import { createClassifier, classify } from '../src/core/classifier.js';
import { deduplicateMessages, deduplicateConversations } from '../src/core/dedup.js';
import { RecallStore } from '../src/core/store.js';
import { searchText, searchFirst, searchTimeline, searchFuzzy } from '../src/core/search.js';

describe('Full import pipeline', () => {
  let store;
  const classifier = createClassifier();

  beforeEach(async () => {
    store = new RecallStore('integration-test-' + Math.random());
    await store.open();
  });

  it('imports ChatGPT file end-to-end', async () => {
    const raw = readFileSync('fixtures/chatgpt_sample.json', 'utf-8');

    // Step 1: Sniff
    const { format, confidence } = sniffFormat(raw);
    expect(format).toBe('chatgpt_array');
    expect(confidence).toBeGreaterThan(0.5);

    // Step 2: Parse
    const { conversations, messages } = await parseExport(raw, format);
    expect(conversations).toHaveLength(1);
    expect(messages.length).toBeGreaterThanOrEqual(2);

    // Step 3: Classify
    for (const conv of conversations) {
      const allText = messages
        .filter(m => m.conversationId === conv.conversationId)
        .map(m => m.text).join(' ');
      const domains = classify(classifier, allText);
      conv.domain = domains.length > 0 ? domains[0][0] : 'general';
      conv.sourceFile = 'chatgpt_sample.json';
    }

    // Step 4: Dedup
    const dedupedConvs = deduplicateConversations(conversations);
    const dedupedMsgs = deduplicateMessages(messages);

    // Step 5: Store
    await store.putConversations(dedupedConvs);
    await store.putMessages(dedupedMsgs);

    // Step 6: Verify
    const stats = await store.getStats();
    expect(stats.conversationCount).toBe(1);
    expect(stats.messageCount).toBeGreaterThanOrEqual(2);

    // Step 7: Search
    const results = await store.searchText('Hello');
    expect(results.length).toBeGreaterThan(0);
  });

  it('imports Claude file end-to-end', async () => {
    const raw = readFileSync('fixtures/claude_sample.json', 'utf-8');

    const { format } = sniffFormat(raw);
    expect(format).toBe('claude_array');

    const { conversations, messages } = await parseExport(raw, format);
    expect(conversations).toHaveLength(1);
    expect(messages).toHaveLength(2);

    for (const conv of conversations) {
      const allText = messages.map(m => m.text).join(' ');
      const domains = classify(classifier, allText);
      conv.domain = domains.length > 0 ? domains[0][0] : 'general';
      conv.sourceFile = 'claude_sample.json';
    }

    await store.putConversations(deduplicateConversations(conversations));
    await store.putMessages(deduplicateMessages(messages));

    const stats = await store.getStats();
    expect(stats.conversationCount).toBe(1);
    expect(stats.messageCount).toBe(2);

    const results = await store.searchText('meaning');
    expect(results).toHaveLength(1);
  });

  it('deduplicates on re-import', async () => {
    const raw = readFileSync('fixtures/chatgpt_sample.json', 'utf-8');
    const { format } = sniffFormat(raw);

    // Import twice
    for (let i = 0; i < 2; i++) {
      const { conversations, messages } = await parseExport(raw, format);
      for (const conv of conversations) {
        conv.sourceFile = `import-${i}.json`;
      }
      await store.putConversations(deduplicateConversations(conversations));
      await store.putMessages(deduplicateMessages(messages));
    }

    const stats = await store.getStats();
    // Messages should be deduped by contentHash within each import
    // but store.putMessages uses put (upsert by messageId), so same IDs overwrite
    expect(stats.conversationCount).toBe(1);
  });

  it('search module works on stored data', async () => {
    const raw = readFileSync('fixtures/chatgpt_sample.json', 'utf-8');
    const { format } = sniffFormat(raw);
    const { conversations, messages } = await parseExport(raw, format);

    await store.putConversations(conversations);
    await store.putMessages(messages);

    // Get all messages for search module testing
    const allMsgs = await store.searchText('');
    // searchText with empty query on store returns nothing, so get via conversation
    const convMsgs = await store.getMessagesByConversation(conversations[0].conversationId);
    expect(convMsgs.length).toBeGreaterThanOrEqual(2);

    // Test pure search functions on the retrieved messages
    const textResults = searchText(convMsgs, 'Hello');
    expect(textResults.length).toBeGreaterThan(0);

    const firstResult = searchFirst(convMsgs, 'Hello');
    expect(firstResult).not.toBeNull();

    const timelineResults = searchTimeline(convMsgs, 'Hello');
    expect(timelineResults.length).toBeGreaterThan(0);
  });

  it('export returns all stored data', async () => {
    const raw = readFileSync('fixtures/claude_sample.json', 'utf-8');
    const { format } = sniffFormat(raw);
    const { conversations, messages } = await parseExport(raw, format);

    await store.putConversations(conversations);
    await store.putMessages(messages);

    const exported = await store.exportAll();
    expect(exported.conversations).toHaveLength(1);
    expect(exported.messages).toHaveLength(2);
    expect(exported.exportedAt).toBeDefined();
  });
});
