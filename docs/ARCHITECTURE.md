# Architecture

## Core Principle

Nothing leaves the browser. There are zero network calls. All processing is local.

## Data Flow

```
File Import
    |
    v
Format Sniffer (sniffer.js)
    |
    v
Parser (parser.js)
    |
    v
Normalizer (normalizer.js)
    |
    v
Classifier (classifier.js)
    |
    v
Deduplicator (dedup.js)
    |
    v
IndexedDB Store (store.js)
    |
    v
Search (search.js)
```

## Module Descriptions

**`src/sniffer.js`**

Inspects the raw input (JSON or JSONL) and identifies the source format. Distinguishes between ChatGPT JSON export (an array containing a conversation graph with a `mapping` field), Claude JSON export (an array of objects with `chat_messages`), and Claude JSONL (newline-delimited JSON objects). Returns a format tag that drives parser selection.

**`src/parser.js`**

Accepts raw file content and a format tag from the sniffer. Extracts conversations and messages into an intermediate representation independent of the source format. Handles the structural differences between ChatGPT's tree-based mapping graph and Claude's flat message arrays.

**`src/normalizer.js`**

Converts the parser's intermediate representation into a uniform schema. Ensures all conversations and messages have consistent field names, normalized timestamps (Unix milliseconds), and canonical role labels (`user` / `assistant`).

**`src/classifier.js`**

Assigns domain classification tags to conversations based on their content. Operates locally using keyword and pattern matching. Tags are attached to the conversation record and are used to filter and facet search results.

**`src/dedup.js`**

Prevents duplicate records when the same file is imported multiple times or exports overlap. Computes a stable fingerprint for each conversation (based on conversation ID or a hash of the first message content and timestamp) and skips records whose fingerprints already exist in the store.

**`src/store.js`**

Manages all reads and writes to IndexedDB. Provides an async API for saving conversations and messages, querying by ID or date range, and deleting all records. The store is the only module that touches persistent storage.

**`src/search.js`**

Full-text and fuzzy search over the stored conversations and messages. Queries are executed locally against IndexedDB records. Supports keyword search, domain tag filtering, and date-range filtering. Returns ranked results with matched excerpts.

**`src/service-worker.js`**

The extension's background service worker. Receives messages from the popup and options page via `chrome.runtime.sendMessage`. Dispatches import operations (sniffer → parser → normalizer → classifier → dedup → store) and search queries. The service worker is the single coordinator; no page has direct access to IndexedDB.

## Extension Communication

```
popup.js  ──── chrome.runtime.sendMessage ────► service-worker.js
                                                        |
options page ── chrome.runtime.sendMessage ────►        |
                                                        ▼
                                                    store.js (IndexedDB)
```

The popup and options page communicate exclusively through message passing to the service worker. Neither page accesses IndexedDB directly. This keeps storage logic centralized and auditable.

## Storage Schema

Recall uses a single IndexedDB database with two object stores.

**`conversations` object store**

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique conversation identifier |
| `title` | string | Conversation title |
| `source` | string | Import format (`chatgpt`, `claude_json`, `claude_jsonl`) |
| `tags` | string[] | Domain classification tags |
| `messageCount` | number | Total message count |
| `createdAt` | number | Unix timestamp (ms) |
| `updatedAt` | number | Unix timestamp (ms) |

Indexes: `createdAt`, `tags`, `source`

**`messages` object store**

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique message identifier |
| `conversationId` | string | Foreign key to `conversations` |
| `role` | string | `user` or `assistant` |
| `content` | string | Message text |
| `timestamp` | number | Unix timestamp (ms) |

Indexes: `conversationId`, `timestamp`

## Supported Import Formats

**ChatGPT JSON export**

Exported from ChatGPT Settings → Data Controls → Export Data as `conversations.json`. Structure: a JSON array where each element represents one conversation. Each conversation contains a `mapping` object — a graph of nodes keyed by UUID, where each node has a `message` field and a `parent` field. The parser walks the graph from the root node to reconstruct the linear message sequence.

**Claude JSON export**

Exported from Claude Settings → Export Data. Structure: a JSON array where each element is a conversation object with a `chat_messages` array. Each message has `role`, `content`, and `created_at` fields.

**Claude JSONL**

Newline-delimited JSON where each line is a conversation or message object. The sniffer detects JSONL by checking whether the input fails to parse as a JSON array but succeeds line-by-line.

## Future Roadmap

**v1.5 — Live Capture**

Capture conversations directly from open ChatGPT or Claude tabs without requiring a manual export. Would require adding `activeTab` or host permissions. The security model changes when live capture is added; this is a deliberate separate milestone.

**v2 — Semantic Search**

Replace or augment keyword search with vector embeddings computed locally using a bundled WASM model (e.g., a quantized sentence transformer). All embedding computation stays local; no embedding API calls.

**v3 — Intelligence Layer**

Cross-conversation analysis: topic clustering, first-mention detection across the full corpus, recurring entity tracking, and timeline visualization across multiple sources.
