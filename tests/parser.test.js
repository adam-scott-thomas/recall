import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseExport } from '../src/core/parser.js';

describe('parseExport', () => {
  it('parses ChatGPT export into conversations and messages', async () => {
    const raw = readFileSync('fixtures/chatgpt_sample.json', 'utf-8');
    const result = await parseExport(raw, 'chatgpt_array');
    expect(result.conversations).toHaveLength(1);
    expect(result.conversations[0].title).toBe('Test Conversation');
    expect(result.messages.length).toBeGreaterThanOrEqual(2);
    expect(result.messages[0].role).toBe('user');
    expect(result.messages[0].text).toContain('Hello');
    expect(result.messages[1].role).toBe('assistant');
  });

  it('parses Claude export into conversations and messages', async () => {
    const raw = readFileSync('fixtures/claude_sample.json', 'utf-8');
    const result = await parseExport(raw, 'claude_array');
    expect(result.conversations).toHaveLength(1);
    expect(result.conversations[0].title).toBe('Test Claude Conversation');
    expect(result.messages).toHaveLength(2);
    expect(result.messages[0].role).toBe('user');
    expect(result.messages[1].role).toBe('assistant');
  });

  it('computes content hashes for dedup', async () => {
    const raw = readFileSync('fixtures/chatgpt_sample.json', 'utf-8');
    const result = await parseExport(raw, 'chatgpt_array');
    for (const msg of result.messages) {
      expect(msg.contentHash).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it('extracts timestamps', async () => {
    const raw = readFileSync('fixtures/chatgpt_sample.json', 'utf-8');
    const result = await parseExport(raw, 'chatgpt_array');
    expect(result.messages[0].timestamp).toBeTypeOf('number');
  });
});
