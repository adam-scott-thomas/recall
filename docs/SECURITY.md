# Security Policy

## What Recall Stores

Recall stores the following data, all within your browser's local IndexedDB:

- **Conversation text** — the content of your imported AI conversations
- **Metadata** — conversation titles, timestamps, message counts, source format
- **Domain classification tags** — topic labels derived locally from conversation content

All data is stored in IndexedDB, which is scoped to the extension's origin and lives entirely within your browser profile on your local machine. No data is written outside of IndexedDB.

## What Recall Does NOT Do

- No cloud storage
- No analytics or telemetry
- No cookies
- No external API calls
- No network requests of any kind — zero

Recall makes **no outbound network connections**. It operates entirely offline after installation.

## Permissions Required

Recall requests exactly one permission:

- **`storage`** — required to read and write IndexedDB

That is the complete list. Recall does not request:

- `activeTab`
- `tabs`
- `webRequest`
- `host_permissions` (no `<all_urls>` or any site-specific permission)
- `cookies`
- `history`
- Any other permission

You can verify this in `manifest.json` at the root of the repository.

## How to Verify

Recall is 100% open source. You can verify its behavior through multiple independent methods:

**Read the source code**

All logic lives in `src/`. There are no obfuscated files, no minified bundles shipped as source, and no external scripts loaded at runtime. The service worker, popup, and options page are plain JavaScript.

**Check the Network tab**

1. Open Chrome DevTools on any page.
2. Go to the Network tab.
3. Use the extension (import a file, run a search).
4. Observe: zero outbound requests appear.

Alternatively, inspect the extension's background service worker:

1. Go to `chrome://extensions`
2. Find Recall and click "Inspect views: service worker"
3. Open the Network tab in that DevTools window
4. Import a file or perform a search
5. Observe: zero network requests

**Export and inspect stored data**

The options page provides a data export button. The exported file is plain JSON. You can open it in any text editor to confirm it contains only the conversation data you imported.

## How to Delete Your Data

**Delete all stored data:**

1. Open the options page (right-click the extension icon → Options, or visit the options page from `chrome://extensions`)
2. Click "Delete All Data"
3. Confirm the prompt

This clears all IndexedDB records for the extension.

**Uninstall the extension:**

1. Go to `chrome://extensions`
2. Click "Remove" next to Recall

Uninstalling the extension removes the extension and its associated storage from your browser profile.

## Dependencies

Recall has no runtime dependencies. The `node_modules/` directory contains only devDependencies used for testing (vitest). None of those packages are bundled into or loaded by the extension itself.

## Reporting Security Issues

To report a security vulnerability or concern, open an issue on the GitHub repository. Please describe the issue clearly. For sensitive findings, you may use GitHub's private vulnerability reporting feature if available on the repository.
