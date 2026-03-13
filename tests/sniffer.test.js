import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { sniffFormat } from '../src/core/sniffer.js';

describe('sniffFormat', () => {
  it('detects ChatGPT array format', () => {
    const data = readFileSync('fixtures/chatgpt_sample.json', 'utf-8');
    const result = sniffFormat(data);
    expect(result.format).toBe('chatgpt_array');
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('detects Claude array format', () => {
    const data = readFileSync('fixtures/claude_sample.json', 'utf-8');
    const result = sniffFormat(data);
    expect(result.format).toBe('claude_array');
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('returns unknown for random JSON', () => {
    const result = sniffFormat('{"foo": "bar", "baz": [1,2,3]}');
    expect(result.format).toBe('unknown');
  });

  it('detects JSONL with uuid+chat_messages as claude_jsonl', () => {
    const data = '{"uuid":"abc","name":"test","chat_messages":[{"sender":"human","text":"hi"}]}\n{"uuid":"def","name":"test2","chat_messages":[]}';
    const result = sniffFormat(data);
    expect(result.format).toBe('claude_jsonl');
  });
});
