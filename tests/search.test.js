import { describe, it, expect } from 'vitest';
import { searchText, searchFuzzy, searchFirst, searchTimeline, levenshtein } from '../src/core/search.js';

const MESSAGES = [
  { messageId: 'm1', conversationId: 'c1', role: 'user', text: 'How do I set up a database migration?', timestamp: 1000, convTitle: 'DB Help' },
  { messageId: 'm2', conversationId: 'c1', role: 'assistant', text: 'Here is the migration strategy for PostgreSQL.', timestamp: 1060, convTitle: 'DB Help' },
  { messageId: 'm3', conversationId: 'c2', role: 'user', text: 'What about authentication patterns?', timestamp: 2000, convTitle: 'Auth' },
  { messageId: 'm4', conversationId: 'c2', role: 'assistant', text: 'JWT and session-based auth are the main approaches.', timestamp: 2060, convTitle: 'Auth' },
];

describe('searchText', () => {
  it('finds messages containing query', () => {
    const results = searchText(MESSAGES, 'migration');
    expect(results).toHaveLength(2);
  });

  it('is case insensitive', () => {
    const results = searchText(MESSAGES, 'POSTGRESQL');
    expect(results).toHaveLength(1);
  });

  it('returns empty for no match', () => {
    expect(searchText(MESSAGES, 'kubernetes')).toHaveLength(0);
  });
});

describe('searchFirst', () => {
  it('returns earliest match', () => {
    const result = searchFirst(MESSAGES, 'migration');
    expect(result.messageId).toBe('m1');
  });

  it('returns null for no match', () => {
    expect(searchFirst(MESSAGES, 'nonexistent')).toBeNull();
  });
});

describe('searchTimeline', () => {
  it('returns matches in chronological order', () => {
    const results = searchTimeline(MESSAGES, 'the');
    expect(results.length).toBeGreaterThan(0);
    for (let i = 1; i < results.length; i++) {
      expect(results[i].timestamp).toBeGreaterThanOrEqual(results[i - 1].timestamp);
    }
  });
});

describe('levenshtein', () => {
  it('returns 0 for identical strings', () => {
    expect(levenshtein('hello', 'hello')).toBe(0);
  });

  it('returns correct distance', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3);
  });
});

describe('searchFuzzy', () => {
  it('finds approximate matches', () => {
    const results = searchFuzzy(MESSAGES, 'migraton', 2);
    expect(results.length).toBeGreaterThan(0);
  });
});
