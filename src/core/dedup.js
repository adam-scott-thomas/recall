// src/core/dedup.js

export function deduplicateMessages(messages) {
  // Compound key: contentHash alone collapses identical text across different
  // conversations (e.g. every "thanks" you ever sent → 1 row). Include
  // conversationId so dedup is per-conversation, and timestamp as a tiebreaker
  // for messages with identical text inside the same conversation (rare but
  // possible with retries / regenerations).
  const seen = new Set();
  return messages.filter(msg => {
    const key = `${msg.conversationId}|${msg.contentHash}|${msg.timestamp ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
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
