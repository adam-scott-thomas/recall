# Recall

Search your AI conversation history. Fully local. Open source.

Recall is a Chrome extension that imports your ChatGPT and Claude conversation exports and makes them searchable in your browser.

Your data stays on your machine. Recall does not send your conversations to a server, analytics tool, or cloud service.

> Recall processes user-provided conversation data entirely locally in the browser and does not transmit, store, or share this data externally.

## What It Does

Recall helps you search and revisit your AI conversation history after importing your own export files.

## Features

- Full-text search across imported conversations
- Fuzzy search for approximate matches
- Local domain classification tags
- Timeline view of conversation history
- First-mention detection for finding when a topic first appeared
- ChatGPT JSON export import
- Claude JSON and JSONL export import

## Privacy and Trust

Recall is built to be local-first and inspectable.

- No outbound network requests
- No cloud storage
- No analytics
- No telemetry
- No cookies
- Data is stored locally in your browser's IndexedDB
- Requires only Chrome's `storage` permission
- Apache 2.0 licensed
- No runtime dependencies

See `docs/SECURITY.md` for details on data handling and how to verify these claims.

## Installation

Recall is currently installed in Chrome developer mode. It is not yet published to the Chrome Web Store.

Clone the repository:

```bash
git clone https://github.com/adam-scott-thomas/recall.git
```

Then:

1. Open Chrome and go to `chrome://extensions`
2. Enable Developer Mode
3. Click Load unpacked
4. Select the `recall/` directory containing `manifest.json`
5. Pin the Recall icon to your toolbar

## Usage

1. Click the Recall extension icon
2. Open the options page
3. Import your ChatGPT or Claude export file
4. Search your conversations from the popup

You can open options by right-clicking the extension icon and selecting Options, or by clicking the gear icon inside the popup.

## Export Your Conversation Data

### ChatGPT

1. Log in to ChatGPT
2. Open Settings
3. Go to Data Controls
4. Click Export Data
5. Download the archive from the email
6. Extract the archive and locate `conversations.json`

### Claude

1. Log in to Claude
2. Open Settings
3. Go to Privacy
4. Click Export Data
5. Download the exported file

## Development

```bash
npm install
npm test
```

Tests run with Vitest. Source files are in `src/`. Tests are in `tests/`.

See `docs/ARCHITECTURE.md` for the data flow and module design.

## Feedback

Feedback is welcome. Recall is early, local-first, and open source, so bug reports, suggestions, and rough edges you notice are genuinely useful.

## License

Apache License 2.0. Copyright GhostLogic LLC.

See [LICENSE](LICENSE) for the full license text.
