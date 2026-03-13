// tests/normalizer.test.js
import { describe, it, expect } from 'vitest';
import {
  normalizeText, normalizeTitle, normalizeRole,
  computeContentHash
} from '../src/core/normalizer.js';

describe('normalizeText', () => {
  it('returns empty string for null/undefined', () => {
    expect(normalizeText(null)).toBe('');
    expect(normalizeText(undefined)).toBe('');
    expect(normalizeText('')).toBe('');
  });

  it('lowercases and collapses whitespace', () => {
    expect(normalizeText('  Hello   World  ')).toBe('hello world');
  });

  it('normalizes unicode to NFC', () => {
    const decomposed = 'e\u0301';
    const composed = '\u00e9';
    expect(normalizeText(decomposed)).toBe(normalizeText(composed));
  });

  it('strips invisible characters', () => {
    expect(normalizeText('hello\u200bworld')).toBe('helloworld');
    expect(normalizeText('test\ufeffvalue')).toBe('testvalue');
  });

  it('normalizes line endings', () => {
    expect(normalizeText('a\r\nb\rc')).toBe('a b c');
  });
});

describe('normalizeTitle', () => {
  it('returns empty for generic titles', () => {
    expect(normalizeTitle('Untitled')).toBe('');
    expect(normalizeTitle('New Chat')).toBe('');
    expect(normalizeTitle('new conversation')).toBe('');
  });

  it('strips punctuation', () => {
    expect(normalizeTitle('Hello, World!')).toBe('hello world');
  });

  it('passes through real titles', () => {
    expect(normalizeTitle('Database Migration Plan')).toBe('database migration plan');
  });
});

describe('normalizeRole', () => {
  it('maps human/user variants to user', () => {
    expect(normalizeRole('human')).toBe('user');
    expect(normalizeRole('Human')).toBe('user');
    expect(normalizeRole('customer')).toBe('user');
  });

  it('maps AI variants to assistant', () => {
    expect(normalizeRole('assistant')).toBe('assistant');
    expect(normalizeRole('claude')).toBe('assistant');
    expect(normalizeRole('GPT')).toBe('assistant');
  });

  it('returns unknown for null', () => {
    expect(normalizeRole(null)).toBe('unknown');
  });
});

describe('computeContentHash', () => {
  it('returns 64-char hex string', async () => {
    const hash = await computeContentHash('user', 'hello world');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic', async () => {
    const a = await computeContentHash('user', 'test');
    const b = await computeContentHash('user', 'test');
    expect(a).toBe(b);
  });

  it('differs for different roles', async () => {
    const a = await computeContentHash('user', 'hello');
    const b = await computeContentHash('assistant', 'hello');
    expect(a).not.toBe(b);
  });
});
