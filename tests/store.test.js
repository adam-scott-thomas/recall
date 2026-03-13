import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { RecallStore } from '../src/core/store.js';

describe('RecallStore', () => {
  let store;

  beforeEach(async () => {
    // Use a unique name per test to avoid cross-test pollution
    store = new RecallStore('recall-test-' + Math.random());
    await store.open();
  });

  it('stores and retrieves a conversation', async () => {
    await store.putConversation({ conversationId: 'c1', title: 'Test', messageCount: 2 });
    const conv = await store.getConversation('c1');
    expect(conv.title).toBe('Test');
  });

  it('stores and retrieves messages', async () => {
    await store.putMessages([
      { messageId: 'm1', conversationId: 'c1', role: 'user', text: 'hello', contentHash: 'h1' },
      { messageId: 'm2', conversationId: 'c1', role: 'assistant', text: 'hi', contentHash: 'h2' },
    ]);
    const msgs = await store.getMessagesByConversation('c1');
    expect(msgs).toHaveLength(2);
  });

  it('searches messages by text', async () => {
    await store.putMessages([
      { messageId: 'm1', conversationId: 'c1', role: 'user', text: 'database migration strategy', contentHash: 'h1' },
      { messageId: 'm2', conversationId: 'c1', role: 'assistant', text: 'here is the plan', contentHash: 'h2' },
    ]);
    const results = await store.searchText('migration');
    expect(results).toHaveLength(1);
    expect(results[0].messageId).toBe('m1');
  });

  it('returns stats', async () => {
    await store.putConversation({ conversationId: 'c1', title: 'T', messageCount: 1 });
    await store.putMessages([{ messageId: 'm1', conversationId: 'c1', role: 'user', text: 'x', contentHash: 'h1' }]);
    const stats = await store.getStats();
    expect(stats.conversationCount).toBe(1);
    expect(stats.messageCount).toBe(1);
  });

  it('exports and clears all data', async () => {
    await store.putConversation({ conversationId: 'c1', title: 'T', messageCount: 0 });
    const exported = await store.exportAll();
    expect(exported.conversations).toHaveLength(1);
    await store.deleteAll();
    const stats = await store.getStats();
    expect(stats.conversationCount).toBe(0);
  });
});
