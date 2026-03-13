// src/core/dedup.js

export function deduplicateMessages(messages) {
  const seen = new Set();
  return messages.filter(msg => {
    if (seen.has(msg.contentHash)) return false;
    seen.add(msg.contentHash);
    return true;
  });
}

export function deduplicateConversations(conversations) {
  const seen = new Map();
  const results = [];
  for (const conv of conversations) {
    if (seen.has(conv.contentHash)) {
      const existing = seen.get(conv.contentHash);
      existing.sourceFiles = existing.sourceFiles || [existing.sourceFile];
      existing.sourceFiles.push(conv.sourceFile);
    } else {
      seen.set(conv.contentHash, conv);
      results.push(conv);
    }
  }
  return results;
}
