# Privacy Policy — Recall

**Last updated:** 2026-04-28
**Live URL:** `https://ghostlogic.tech/recall/privacy`

Recall is a Chrome extension that imports and searches your ChatGPT and Claude conversation exports entirely on your own device. This policy describes, plainly, what data Recall handles and what it does not.

> **Recall processes user-provided conversation data entirely locally in the browser and does not transmit, store, or share this data externally.**

## What Recall does

Recall reads conversation export files that you select from your local computer, parses them, and stores the parsed contents in your browser's IndexedDB so you can search them later from the Recall popup.

## What Recall stores

Recall stores the contents of conversation export files that you choose to import — message text, conversation titles, timestamps, and metadata derived from those exports — in your browser's IndexedDB. This data is scoped to your browser profile and is removed when you uninstall the extension.

Recall does not store, transmit, or otherwise process any other data on or about you.

## Limited Use disclosure

Recall complies with the Chrome Web Store User Data Policy, including its Limited Use requirements:

- The data Recall handles (your imported AI conversation exports) is used **solely** to provide and improve the user-facing search feature of the extension. It is not used for any other purpose.
- Recall does **not** transfer this data to any third party except as needed to provide the search feature, and there is no such third party in Recall's design — the data never leaves your browser.
- Recall does **not** use this data for advertising, including personalized or targeted advertising.
- Recall does **not** allow humans to read this data, except where the user explicitly chooses to view it inside the extension's own UI.
- Recall does **not** sell this data.

## What Recall transmits

**Nothing.** Recall makes no outbound network requests of any kind. There is no Recall server. There is no analytics provider. There is no telemetry endpoint. There is no error reporting service.

You can verify this by:

1. Opening Chrome DevTools on the popup or options page and watching the Network tab during use.
2. Inspecting the extension permissions in `chrome://extensions/` — Recall declares only `storage` and no `host_permissions`.
3. Reading the source on GitHub (https://github.com/adam-scott-thomas/recall) and grepping for `fetch`, `XMLHttpRequest`, or `WebSocket`.

## Permissions

**Recall declares zero permissions.** All data is stored in IndexedDB, which is available to extensions without any permission declaration. There is nothing for Chrome to grant Recall, because Recall does not ask Chrome for anything beyond running its own popup and options page.

In particular, Recall does not request:

- `storage`
- `host_permissions`
- `tabs`
- `activeTab`
- `webRequest`
- `cookies`
- `history`
- Any content-script injection on any site

## Third parties

Recall does not share data with any third party because Recall does not transmit data to any party at all.

The only third-party code in the source repository is development tooling (`vitest`, `fake-indexeddb`) used to run unit tests. None of it is shipped in the extension package.

## Children's privacy

Recall is a developer-mode utility for managing your own AI conversation exports. It is not directed at children under 13 and does not knowingly collect any data from anyone, including children.

## Changes to this policy

If a future version of Recall ever changes the data-handling model — for example, an opt-in cloud-sync feature — this policy will be updated and the extension's listing will explicitly call out the change. Until then, the rules above hold.

## Contact

Questions or concerns: email **support@ghostlogic.tech**.

## Open source

Recall is licensed under Apache 2.0. The full source is available at https://github.com/adam-scott-thomas/recall.
