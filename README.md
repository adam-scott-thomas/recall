# Recall

Search your AI conversation history. Fully local, open source.

## What It Does

Recall is a Chrome extension that imports your ChatGPT and Claude conversation exports and makes them searchable. Everything runs in your browser. No data leaves your machine.

Features:

- Full-text search across all imported conversations
- Fuzzy search for approximate matches
- Domain classification tags (automatically assigned locally)
- Timeline view of your conversation history
- First-mention detection — find when you first discussed a topic
- Import ChatGPT JSON exports and Claude JSON/JSONL exports

## Privacy and Trust

- Zero network calls — Recall makes no outbound requests, ever
- All data stays in your browser's IndexedDB
- No cloud, no analytics, no telemetry, no cookies
- One permission required: `storage`
- MIT licensed — read every line of the source
- No runtime dependencies — only devDependencies for testing

See [docs/SECURITY.md](docs/SECURITY.md) for full details on data handling and how to verify these claims independently.

## Installation

Recall is a Chrome extension installed in developer mode. It is not published to the Chrome Web Store.

1. Clone this repository:
   ```
   git clone https://github.com/ghostlogic/recall.git
   ```

2. Open Chrome and go to `chrome://extensions`

3. Enable Developer Mode (toggle in the top-right corner)

4. Click "Load Unpacked"

5. Select the `recall/` directory (the one containing `manifest.json`)

The extension icon will appear in your toolbar.

## Usage

1. Click the Recall extension icon to open the popup search interface

2. Go to the options page to import your export file:
   - Right-click the extension icon and select Options, or
   - Click the gear icon inside the popup

3. Select your ChatGPT or Claude export file and click Import

4. Search your conversations from the popup

## How to Export Your Conversation Data

**ChatGPT:**

1. Log in to ChatGPT
2. Click your profile icon → Settings
3. Go to Data Controls
4. Click Export Data
5. Wait for the email from OpenAI, then download the archive
6. Extract the archive and locate `conversations.json`

**Claude:**

1. Log in to Claude
2. Click your profile icon → Settings
3. Go to Privacy
4. Click Export Data
5. Download the exported file

## Development

```
npm install
npm test
```

Tests run with vitest. Source files are in `src/`. Tests are in `tests/`.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for a description of the data flow and module design.

## License

MIT License. Copyright GhostLogic LLC.

See [LICENSE](LICENSE) for the full license text.
