// src/core/search.js

export function searchText(messages, query, limit = 50) {
  if (!query) return [];
  const q = query.toLowerCase();
  const results = [];
  for (const msg of messages) {
    if (!msg.text) continue;
    const text = msg.text.toLowerCase();
    if (text.includes(q)) {
      // Score by density: occurrences * query.length / text.length
      let count = 0;
      let pos = 0;
      while ((pos = text.indexOf(q, pos)) !== -1) {
        count++;
        pos += q.length;
      }
      const score = (count * q.length) / text.length;
      results.push({ ...msg, score });
    }
  }
  // Sort first, then slice — otherwise we drop high-scoring matches that
  // happen to sit late in the message array.
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

export function searchFirst(messages, query) {
  if (!query) return null;
  const q = query.toLowerCase();
  let earliest = null;
  for (const msg of messages) {
    if (!msg.text) continue;
    if (msg.text.toLowerCase().includes(q)) {
      if (!earliest || msg.timestamp < earliest.timestamp) {
        earliest = msg;
      }
    }
  }
  return earliest;
}

export function searchTimeline(messages, query, limit = 50) {
  if (!query) return [];
  const q = query.toLowerCase();
  const matches = messages.filter(m => m.text && m.text.toLowerCase().includes(q));
  matches.sort((a, b) => a.timestamp - b.timestamp);
  return matches.slice(0, limit);
}

export function levenshtein(s, t) {
  if (s === t) return 0;
  if (s.length === 0) return t.length;
  if (t.length === 0) return s.length;

  let prev = Array.from({ length: t.length + 1 }, (_, i) => i);
  let curr = new Array(t.length + 1);

  for (let i = 1; i <= s.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= t.length; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,      // deletion
        curr[j - 1] + 1,  // insertion
        prev[j - 1] + cost // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[t.length];
}

export function searchFuzzy(messages, query, maxDistance = 2, limit = 20) {
  if (!query) return [];
  const q = query.toLowerCase();
  const results = [];

  for (const msg of messages) {
    if (!msg.text) continue;
    const words = msg.text.toLowerCase().split(/\s+/);
    let bestDist = Infinity;
    for (const word of words) {
      const dist = levenshtein(q, word);
      if (dist < bestDist) bestDist = dist;
      if (dist === 0) break;
    }
    if (bestDist <= maxDistance) {
      results.push({ ...msg, distance: bestDist, score: 1 - bestDist / (q.length || 1) });
    }
  }

  // Sort first, then slice — same reason as searchText.
  results.sort((a, b) => a.distance - b.distance);
  return results.slice(0, limit);
}
