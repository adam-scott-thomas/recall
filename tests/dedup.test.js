import { describe, it, expect } from 'vitest';
import { deduplicateMessages, deduplicateConversations } from '../src/core/dedup.js';

describe('deduplicateMessages', () => {
  it('removes messages with duplicate content hashes', () => {
    const msgs = [
      { messageId: 'a', contentHash: 'hash1', text: 'hello' },
      { messageId: 'b', contentHash: 'hash2', text: 'world' },
      { messageId: 'c', contentHash: 'hash1', text: 'hello' },
    ];
    const result = deduplicateMessages(msgs);
    expect(result).toHaveLength(2);
    expect(result.map(m => m.messageId)).toEqual(['a', 'b']);
  });

  it('returns empty for empty input', () => {
    expect(deduplicateMessages([])).toEqual([]);
  });
});

describe('deduplicateConversations', () => {
  it('merges conversations with same content hash', () => {
    const convs = [
      { conversationId: 'c1', contentHash: 'h1', title: 'Test', sourceFile: 'file1.json' },
      { conversationId: 'c2', contentHash: 'h1', title: 'Test', sourceFile: 'file2.json' },
      { conversationId: 'c3', contentHash: 'h2', title: 'Other', sourceFile: 'file1.json' },
    ];
    const result = deduplicateConversations(convs);
    expect(result).toHaveLength(2);
  });
});
