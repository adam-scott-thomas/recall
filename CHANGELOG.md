# Recall — Changelog

## v1.1.0 — 2026-04-29

Added: plain-document import. Recall now searches `.txt`, `.md` / `.markdown` /
`.mdown` / `.mkd`, and `.html` / `.htm` / `.xhtml` files alongside ChatGPT and
Claude conversation exports.

Each imported document becomes a one-message conversation with the title taken
from (in priority order):

- HTML: the `<title>` element
- Markdown: the first ATX heading (or first short non-empty line)
- Text or no detected title: the filename minus extension

HTML body extraction uses `DOMParser` when available (Chrome popup, options,
and MV3 service worker contexts all support it), with a regex fallback for
malformed input. `<script>`, `<style>`, and `<noscript>` blocks are stripped.

Import flow, permissions, and privacy posture are unchanged from v1.0.0:

- Zero permissions declared
- Zero outbound network requests
- 25 MB per-file cap
- Apache 2.0, Copyright GhostLogic LLC

## v1.0.0 — 2026-04-28

Initial Chrome Web Store release.

- ChatGPT (`.json`) and Claude (`.json` / `.jsonl`) export import
- Full-text, fuzzy, first-mention, and timeline search modes
- Local domain-classification tags
- IndexedDB storage, scoped to the browser profile
- Zero permissions, zero outbound network requests, no analytics
