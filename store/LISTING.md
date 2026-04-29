# Chrome Web Store Listing — Recall

Submission copy for Chrome Web Store. Keep within character limits noted in parentheses.

---

## Item details

**Name** (max 75 chars)
> Recall — Search Your AI Conversation History

**Summary** (max 132 chars; appears in search results and the install card)
> Search every ChatGPT and Claude conversation you've ever had. Fully local. Zero network calls. Zero permissions.

**Category**
> Productivity

**Language**
> English

---

## Detailed description (max 16,000 chars)

> ### Search every conversation you've ever had with ChatGPT or Claude — locally, in your browser.
>
> Recall imports your ChatGPT and Claude data exports and turns them into a searchable archive that lives entirely inside your browser. No server. No account. No cloud. No telemetry. No analytics. Zero Chrome permissions declared.
>
> ### What you get
>
> - **Full-text search** across every message in every conversation you've imported.
> - **Fuzzy search** for approximate matches — useful when you remember the gist but not the words.
> - **Timeline view** of your conversation history so you can see when you were working on what.
> - **First-mention detection** — instantly find when you first discussed a topic, person, or project.
> - **Automatic domain tags** assigned locally on import (no external classifier).
> - **Both ChatGPT JSON and Claude JSON/JSONL exports** supported.
>
> ### How privacy actually works
>
> Most "private" tools assume you'll trust them. Recall is built so you don't have to.
>
> - **Zero network calls.** Recall makes no outbound HTTP requests, ever. Verifiable by inspecting the source or watching the Network tab — there is no server to talk to.
> - **Zero permissions.** Recall declares no `storage`, no `host_permissions`, no `tabs`, no `activeTab`, no content scripts, no remote code. IndexedDB is available to extensions without any permission declaration.
> - **All data lives in IndexedDB** inside your browser profile. Uninstall the extension and the data is gone.
> - **No runtime dependencies.** The only third-party code in the repo is dev-only test tooling (vitest, fake-indexeddb).
> - **Apache 2.0 open source.** Read every line of the source on GitHub. The package on the Web Store is built from a tagged commit and the build is reproducible.
>
> ### How to use it
>
> 1. Click the Recall icon in your browser toolbar.
> 2. Open the options page and import your ChatGPT or Claude data export.
> 3. Search.
>
> ### How to get your conversation data
>
> **ChatGPT:** Profile → Settings → Data Controls → Export Data. OpenAI emails you a download. Inside the archive, find `conversations.json`.
>
> **Claude:** Profile → Settings → Privacy → Export Data. Download the file.
>
> Drop either file into Recall's options page and you're done.
>
> ### Who this is for
>
> - Researchers, writers, and engineers who use AI tools daily and want their own history searchable.
> - Anyone who's ever thought "I asked ChatGPT this six months ago, where did it go?"
> - People who want their AI conversation history without trusting a third party with it.
>
> ### Open source and licensing
>
> Apache License 2.0. Source: https://github.com/adam-scott-thomas/recall
>
> Built by GhostLogic. https://ghostlogic.tech/recall

---

## Privacy practices (Chrome Web Store form)

Chrome Web Store requires you to declare data handling. Recall's answers:

| Question | Answer |
|---|---|
| Does this extension collect or use the user's personal or sensitive information? | **No** transmission. The user voluntarily imports their own conversation export files into local browser storage (IndexedDB). The data never leaves the browser. |
| Single purpose | Local search of user-imported AI conversation export files. |
| Permission justification | **Recall declares zero permissions.** No `host_permissions`, no content scripts, no remote code. |
| Remote code | **No.** All scripts are bundled in the extension package; no remote code is loaded. |
| Data usage certification | I certify that the use of data in Recall complies with the Chrome Web Store Developer Program Policies, including the Limited Use requirements of the User Data Policy. |

### Reviewer test instructions

Provide these in the "Notes for the reviewer" field on the Web Store dashboard:

> 1. Install the extension.
> 2. Open the Recall settings page (right-click the extension icon → Options).
> 3. Import a small ChatGPT `conversations.json` export or a Claude JSON/JSONL export.
> 4. Open the Recall popup (or click "Open Search" for the full-tab view).
> 5. Search for a known phrase from the imported file — results should appear with the matched phrase highlighted.
> 6. Use "Export All Data" and "Delete All Data" from the settings page.
>
> Expected: all data remains local. The extension makes no network requests, uses no analytics, and loads no remote code.

**Privacy policy URL:** `https://ghostlogic.tech/recall/privacy`

**Homepage URL:** `https://ghostlogic.tech/recall`

**Support URL:** `https://ghostlogic.tech/recall/issues`

---

## Screenshots (you'll capture these — recommended set, all 1280×800 PNG)

1. **Popup search in action** — query field with a result list showing 3-5 highlighted matches.
2. **Options page mid-import** — showing a ChatGPT or Claude file selected, with the import progress / "Imported N conversations" status.
3. **Timeline view** — a chronological strip with conversations grouped by date.
4. **First-mention detection** — example query like "transformers" with a "first mentioned 2024-03-12" callout.
5. **Empty state** — clean popup before any import, with the "Import your data" prompt. Demonstrates how minimal the surface is.

Optional sixth tile: a static "what Recall doesn't do" graphic — `host_permissions: none`, `network calls: 0`, `analytics: none`. Strong reinforcement of the privacy story.

---

## Promotional images (optional but help conversion)

- **Small promo tile** — 440×280 PNG. Logo + tagline "Search your AI conversations. Locally."
- **Marquee promo tile** — 1400×560 PNG. Used if Chrome Web Store features the extension.

---

## Submission checklist

- [ ] Bump `manifest.json` and `package.json` to 1.0.0 (done)
- [ ] CI green on main
- [ ] Privacy policy live at `https://ghostlogic.tech/recall/privacy`
- [ ] Capture 5 screenshots at 1280×800
- [ ] Capture 440×280 small promo tile
- [ ] Build via `npm run package` and confirm zip is < 10 MB
- [ ] Tag the commit (`git tag v1.0.0 && git push --tags`)
- [ ] Upload to Chrome Web Store dashboard (one-time $5 dev fee if not already paid)
- [ ] Fill privacy practices form (answers above)
- [ ] Submit for review (typical turnaround: 1–3 business days)
