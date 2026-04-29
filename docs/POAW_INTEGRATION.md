# Recall ↔ ProofOfAIWork integration — design options

**Date:** 2026-04-28
**Status:** Proposal — pick one path before writing any code.

## The pitch in one line

Recall already has the user's conversation export sitting in IndexedDB. ProofOfAIWork (POAW) already exposes upload, conversations, and assessments APIs. Wiring them together turns "I have a searchable archive" into "I have a portfolio piece that proves the AI-assisted work I did."

## What POAW already gives us

| Endpoint | Use |
|---|---|
| `POST /auth/magic-link` | Passwordless login via emailed link |
| `GET /auth/callback` | Completes the magic-link flow, sets session |
| `GET /auth/me` | Current user identity |
| `POST /uploads/presign` | Get presigned URL for direct file upload |
| `PUT /uploads/{id}/file` | Upload the file body |
| `POST /uploads/complete` | Finalize and trigger processing |
| `GET /conversations` | List uploaded conversations |
| `POST /conversations/{id}/tags` | Tag conversations |
| `GET /assessments` | List assessment runs |
| `POST /assessments/{id}/rerun` | Re-run an assessment |

POAW assessments are the value prop on the receiving side — POAW analyzes the conversation, scores the AI-assisted work, and produces a verifiable proof page. Recall is the cleanest possible feeder for that.

## Privacy non-negotiables

Recall's entire pitch is **zero network calls, one permission**. Any POAW integration must not break that promise for users who don't opt in. Constraints:

1. The POAW feature must be **strictly opt-in** — disabled by default, no requests until the user explicitly clicks something.
2. The privacy policy must be updated to disclose that **if** the user opts in, conversations they explicitly select will be transmitted to `proofofaiwork.com`, and that this is the only situation in which Recall makes any network calls.
3. The Chrome Web Store listing must clearly call out the optional integration and link the POAW privacy policy.
4. To make the optional network access explicit and reviewable, the extension must request `host_permissions` for `https://proofofaiwork.com/*` (or the API origin) — and the listing must justify it.

## Four design options

Each is sketched with UX, technical surface, and tradeoffs. Pick one — they're not additive.

---

### Option 1 — "Send to POAW" button (lightest touch)

**UX:** A single "Send to ProofOfAIWork" button next to each conversation in Recall's popup. Click → opens a new browser tab to POAW with a one-time signed handoff token in the URL fragment. POAW grabs the conversation from a temporary handoff endpoint exposed by the extension (or, simpler, from a paste-buffer flow).

**How simple paste-buffer flow works:**
1. Click "Send to POAW" on a conversation.
2. Recall serializes the single conversation to JSON.
3. Recall opens `https://proofofaiwork.com/import?via=recall` in a new tab.
4. POAW's import page reads the data via `window.postMessage` from the originating extension tab, OR via a clipboard handoff the user explicitly approves.

**Pros:**
- No auth flow inside Recall. POAW handles login on its side.
- Network surface stays clean — Recall still doesn't talk to any server; it hands data to a tab the user opened.
- Fastest to build. ~1 day.

**Cons:**
- Clunky for sending many conversations at once.
- Users may not realize the data is leaving the browser unless we're loud about it (we should be).

**Permission impact:** Adds `tabs` permission only if we want to programmatically open the tab in a specific way. Otherwise zero.

**Privacy policy delta:** Adds one paragraph: "If you click 'Send to ProofOfAIWork', the selected conversation is handed to a tab on proofofaiwork.com that you control. Recall itself still makes no outbound network calls."

---

### Option 2 — "Login with POAW" + direct API upload (cleanest, fully integrated)

**UX:** Settings page in Recall has a "Connect ProofOfAIWork" section. User clicks → magic-link flow opens in a tab → POAW redirects back to a registered extension callback → Recall stores a bearer token. From that point, conversations have a "Send to POAW" button that calls POAW's upload API directly. Optional bulk action: "Send all from last 30 days."

**Technical surface:**
- Use POAW's existing magic-link flow. Add a callback route that redirects to `chrome-extension://<id>/src/options/options.html#poaw-token=...` (or use `chrome.identity.launchWebAuthFlow` for the standard pattern).
- Store the token in `chrome.storage.local` (encrypted at rest by Chrome).
- Upload flow: presign → PUT file → complete. Three calls per conversation.
- Show upload progress + result link to the POAW assessment.

**Pros:**
- Best UX. One click per conversation, or bulk. Works exactly like a normal SaaS connector.
- POAW can build features around the integration (auto-assess on upload, surface "from Recall" in the dashboard).
- Easy to add account status display ("Connected as adam@example.com").

**Cons:**
- Most surface to build. ~3-4 days.
- Requires `host_permissions` for the POAW API origin, which weakens the "one permission" pitch — but it's transparent and opt-in.
- Need to maintain a stable extension ID and register the redirect URL with POAW.

**Permission impact:**
- Add `host_permissions: ["https://proofofaiwork.com/*"]`
- Optionally add `identity` if using `chrome.identity.launchWebAuthFlow`

**Privacy policy delta:** Substantial. Need a dedicated section describing what gets uploaded, when, by whose action, and how to revoke the connection.

**Recommended for v1.1+ once the extension has a user base.** Don't ship this in v1.0 — it dilutes the launch story.

---

### Option 3 — Export-and-upload (zero new permissions)

**UX:** In Recall's popup or options, a "Export selected to POAW format" button downloads a JSON file. User then drags that file into POAW's existing upload flow on proofofaiwork.com.

**Technical surface:**
- Recall serializes selected conversations to a normalized JSON envelope POAW can ingest.
- Triggers a standard browser download. No network call from Recall.
- Optional: include a small CTA on the success screen ("Drop this into proofofaiwork.com →" with a link).

**Pros:**
- Zero new permissions. Privacy story stays pristine.
- Trivial to build. Half a day.
- Works the same way Recall already handles ChatGPT/Claude exports — symmetric model.

**Cons:**
- Two-step UX (export, then upload).
- Misses the "magic moment" that direct integration gives you.

**Permission impact:** None.

**Privacy policy delta:** None — the file leaves the browser by user action (a download), same as any other browser download.

---

### Option 4 — "Recall Lens" page on POAW (server-side reads what user pastes)

**UX:** POAW hosts a `/lens/recall` page. User pastes the conversation JSON (or drags the file) into the page. POAW parses it and runs an assessment. Recall just adds a "Copy to Clipboard for POAW Lens" button.

**Pros:**
- Recall stays utterly clean — only thing it does is copy text to clipboard, which it already has user permission to do via the user gesture.
- All the integration work happens on the POAW side, where you have a full server team.
- No auth flow to design inside the extension.

**Cons:**
- Worst UX of the four. Nobody enjoys "copy this big blob and paste it over there."
- Requires you to ship the corresponding `/lens/recall` page on POAW.

**Permission impact:** None (clipboardWrite is implicit on user gesture).

**Privacy policy delta:** None.

---

## Recommendation

Ship in this order:

1. **v1.0 launch:** No POAW integration. Land the privacy story and Chrome Web Store listing first. Don't muddy the message.
2. **v1.1 (1-2 weeks after launch):** **Option 3 (export-and-upload)**. Free wins, no permissions, no policy changes. Adds the cross-product handoff without weakening the launch pitch.
3. **v1.2+ (after first real users):** **Option 2 (login + direct upload)** for users who actually use Recall and want the deeper integration. Treat it as an opt-in upgrade with its own onboarding and permission disclosure.

Skip Options 1 and 4 — Option 1's clipboard/postMessage handoff is fragile, and Option 4's UX is bad enough that it barely counts as an integration.

## Branding callout

Whichever option ships, label the affordance clearly:

> **Send to ProofOfAIWork** — Turn this conversation into a verifiable record of AI-assisted work.

The user should always know they're crossing a network boundary before they cross it.
