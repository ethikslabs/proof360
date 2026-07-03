# CER Persona Gap-Prompt — Design (Slice 5)

**Date:** 2026-07-01
**Status:** design — approved in brainstorm, pending spec review
**Depends on:** slice 3b (`useCer`, `cerPathways`, the CER dock in `Chat.jsx`) — currently in PR #5 (`feat/cer-conversation-flow`)
**Resolves:** Codex P2 on PR #5 (`Chat.jsx:1363` — a non-demo founder with no company on record and no URL scan can trigger a pathway but never reach the agency card, because `companyName` stays null and the Company gate never ticks)

---

## Problem

A CER needs a company. The `agencyReady` gate requires the `company` field to be `done`. But for a signed-in founder whose profile has no company and who hasn't run a URL cold-read, `companyName` is null — and `inferProfile` extracts stage/sector/signals from chat, never a company *name*. So the founder can trigger a pathway by talking, confirm the route, and then stall: the agency/consent card can't appear.

We will **not** resolve this by weakening the gate (a CER with no company is semantically wrong) or by adding a form field (the product explicitly refuses forms).

## Principle

A missing required field is a **prompt moment**, not a gate failure. When a CER is forming and a required field is missing, the **fitting lens** (Sophia/Edison/Leonardo) asks for it conversationally. The founder supplies it any way — a name, a website, a pitch deck — and it **accretes into the founder entity as a claim**, ticking the field. Purely human experience: one voice-appropriate ask, no form, the entity builds gradually.

## Field → lens mapping

Per-field natural owner (the right expert asks for the right thing, even mid-pathway):

| Field | Owning lens | Example ask |
|---|---|---|
| `company` | **Sophia** (identity/narrative) | "Before I set this up — what's the company called? A name, a website, or a deck all work." |
| `contact` | Sophia | "And who should I put as the contact on this?" |
| `need` | pathway lens (Edison compliance/cloud, Leonardo commercial) | rarely missing — it triggered the pathway |
| `evidence` | Edison (proof) | "Anything that backs this — a report, a policy doc, an invoice?" |
| `route` / `consent` / `visibility` | — | never prompted (system-proposed / agency card / derived) |

## Scope (YAGNI)

The only gate field that is *commonly* empty is **`company`** (for a signed-in founder, `contact` = their name is usually present; `need` triggered the pathway; `evidence` is **not** a gate). So:

- **MVP: the `company` prompt (Sophia).** This is exactly the field Codex flagged.
- The field→lens map is **extensible** — `contact`/`evidence` prompts drop in later by adding map entries, no structural change.
- One field at a time. No proactive nagging.

## Mechanism

1. **Trigger — at route-confirm.** When the founder clicks "Use the … pathway →" (`confirmRoute`), if `agencyReady` is still false because a *gate* field is missing, intercept: instead of the agency card, the owning lens asks for the highest-priority missing gate field. (Fires only when the gap actually blocks.)
2. **Capture.** The prompt sets an `awaitingField` state (e.g. `'company'`). The founder's next chat message resolves it:
   - **If the message contains a URL** → hand off to the existing cold-read path (`extractUrl` → session start → `company_name` from the scan). Do **not** treat the URL string as the literal company name.
   - **Otherwise** → treat the reply as the answer (a targeted question means the reply *is* the value). Write it to local `companyProfile` (so `useCer.companyName` ticks immediately) **and** persist it as a founder-memory fact via the existing event path (`persistFounderMemoryEvent` → `postProfileEvent`, best-effort; `company_name` is already in the `EXPLICIT_FACT_FIELDS` whitelist).
   - `awaitingField` clears when the field fills by any route.
   - **MVP assumption:** the reply answers the prompt. If the founder instead asks an unrelated question, the reply is still captured as the value — an explicit "skip / never mind" affordance is a documented future refinement, out of scope here.
3. **Re-evaluate.** Once the field ticks, re-check `agencyReady`. When all gates are met, the agency/consent card appears exactly as today.

## Where it hooks (existing code)

- **`cerPathways.js`** — add `FIELD_LENS` (map: gate field → `{ persona, prompt }`) and `firstMissingGate(fields)` → the highest-priority missing gate field (priority: company → contact → need), or `null`. Pure functions.
- **`useCer.js`** — add `awaitingField` state + `captureAwaited(value)`; on `confirmRoute`, if not `agencyReady` and `firstMissingGate` returns a field, set `awaitingField` and return the field's `{ persona, prompt }` so the caller can inject the persona message. Expose `awaitingField`.
- **`Chat.jsx`** —
  - on route-confirm, if `useCer` reports an awaiting field, inject the persona message (reuse the existing `setMessages` persona-bubble injection);
  - in `submit()`, if `awaitingField` is set, capture the message into that field (set `companyProfile`, persist fact, `captureAwaited`) and skip the normal pathway-detection for that turn.

## HX guards / invariants

- Persona speaks as a **lens, not an assistant** (invariant #6) — precise, unhurried, no "happy to help".
- **No form field.** The ask is a chat message; the answer is a chat message.
- **One ask per message.**
- Fires **only when blocking** (route confirmed + gate missing) — no proactive prompts in MVP.
- Demo/workspace boundary and all other invariants unchanged.

## Testing

- **`cerPathways`** — `firstMissingGate`: returns `company` when company missing; respects priority; returns `null` when all gates present. `FIELD_LENS` has an entry for each gate field it can return.
- **`useCer`** — `confirmRoute` with company missing sets `awaitingField='company'` and does **not** open the agency; `captureAwaited('Acme')` (with company then present) clears `awaitingField` and `agencyReady` becomes true.
- **Flow** — the persona prompt renders in the stream; a reply capture ticks Company and the agency card follows.

## Success condition

A signed-in founder with no company on record triggers a pathway by chatting, confirms the route, and is asked by **Sophia** for the company. They reply in natural language (or drop a URL), it accretes into their entity, Company ticks, and the CER proceeds to the agency card — no form, one voice-appropriate ask.
