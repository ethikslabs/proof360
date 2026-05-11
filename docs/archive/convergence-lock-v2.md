# Convergence Lock — Proof360 v2

**Status:** Round 5 convergence complete between Claude.ai (Operator) and ChatGPT (Architect). Awaiting John (Final Authority) sign-off.
**Date:** 2026-04-23
**Inputs:** `convergence-seed-v2.md` (Claude.ai), Round 5 response (ChatGPT)

---

## 1. Locked positions

| Position | State |
|---|---|
| Option B direction (expand Track A into v2, not Track C pentad-rewrite) | ✔ locked both sides |
| Cold read as pitch; no deck externally | ✔ locked |
| Controlled artefact internally (partner circulation, committee, RFP) | ✔ locked — deck is serialization layer, not pitch tool |
| Landing strategy: Option α (single cold read entry, persona hints below fold only) | ✔ locked |
| Cold read = invariant truth surface | ✔ locked |
| Persona = Layer 2 only (interpretation layer above invariant) | ✔ locked |
| Track B = live demonstration protocol, not slides | ✔ locked — choreography not collateral |
| Pentad doctrine untouched (VECTOR, VERITAS, NEXUS, PULSUS, IMPERIUM preserved) | ✔ locked |
| Privacy posture: "public-source analysis" disclaimer, access logging, redaction of personal-level signals where unnecessary | ✔ locked |
| HX First frame: "how the world sees you" not "what you are"; HX applies to user of system, not subject | ✔ locked |
| Pre-run cost: GTM spend, not infra problem. No premature optimisation. | ✔ locked |

---

## 2. Kiro scope — reconciled (ChatGPT tighter, adopted)

### Overnight build (strict)

1. **Shareable cold read URL** — `?url=X` parameter on `/audit/cold-read` with clean share CTA
2. **`/admin/preread`** — batch URL input, run cold read per URL, output shareable links
3. **Landing page swap** — cold read front and centre, minimal marketing copy, persona hints below fold as non-entry text
4. **ProgramMatchCard only** — added to Layer 2 founder report, reads AWS programs customer qualifies for

### Removed from overnight (deferred, not cancelled)

- Full F1 foundation (shadcn/ui, tanstack-query, zustand install + substrate components)
- Auth refactor to single Auth0 tenant
- F2 full founder surface refactor
- RiskHeatmap component (next slice after ProgramMatchCard validated)
- Multi-persona surfaces (F3-F8)
- New backend handlers beyond `GET /api/program-match/:session_id`

### Principle locked

> Ship GTM lever, not architecture.

---

## 3. Architectural challenges raised by ChatGPT (John decides)

These are new decisions not in the seed. Surfaced by ChatGPT's review.

### Challenge 1 — Signal credibility drift

**Risk:** ~215 signals without weighting = noise overwhelms signal.

**Proposed fix:** signal weighting model introduced early, before signal pipeline Phase 2 ships. Not all signals equal.

**Decision needed:** weighting approach (static per-signal weights, tier-based, learned from outcomes, or hybrid).

**Default recommendation:** static tier-based weights in `api/src/config/signals.js` (critical/high/medium/low/positive), refined later from close-rate data.

### Challenge 2 — Cold read quality variance

**Risk:** bad cold read output = credibility loss. Failed sources currently swallowed silently.

**Proposed fix:** confidence indicators + fallback messaging on the cold read page. "High confidence" vs "partial read — some sources unavailable" with explicit naming.

**Decision needed:** show confidence at source level, gap level, or whole-report level.

**Default recommendation:** whole-report confidence ribbon + per-gap confidence chip. No per-source noise.

### Challenge 3 — Over-expansion of personas

**Risk:** 6 surfaces = complexity explosion.

**Proposed fix:** feature flags default-off for all non-founder personas. Founder only active in public surface. Other surfaces dark until commercial motion for each is live.

**Decision needed:** flag system mechanism (config file vs DB table vs Auth0 custom claim).

**Default recommendation:** simple config file (`api/src/config/features.js`), committed to repo, John edits to turn surfaces on. DB table later when per-tenant flagging needed.

---

## 4. Open minor items (not blocking overnight build)

| Item | Status |
|---|---|
| Pricing precision trigger (when does per-assessment cost need tracking to $0.01) | open |
| Attribution visibility to partners (how much do Austbrokers / Ingram see in their own portal) | open |
| Signal weighting model (tier-based / learned / hybrid) | open, default above |

---

## 5. Doctrine verification

Both sides confirm no violations of:
- AWS hard-code ✔
- VECTOR plane ✔
- HX First ✔
- Show don't tell ✔
- Track A priority ✔
- VERITAS as trust substrate ✔ (strengthened: claims now source-grounded in signals)

---

## 6. State

Convergence complete between Claude.ai and ChatGPT. No further structural decisions required.

**Awaiting from John:**
1. Sign-off on Section 2 (Kiro overnight scope)
2. Decisions on Section 3 (three architectural challenges) OR defer to defaults
3. Next artefact choice: "build spec" / "deck spec" / both (ChatGPT offer, preserved here)

---

## 7. Next artefact choice

ChatGPT offered two next steps. John picks one or both.

### "build spec"
Exact Kiro-ready output:
- Endpoint contract for `GET /api/program-match/:session_id` (input, output, error shape)
- ProgramMatchCard component prop schema
- `?url=X` parameter handling spec on `/audit/cold-read`
- `/admin/preread` UI + batch pipeline spec
- Landing page swap — what stays, what goes, what copy changes
- Feature flag config structure
- Confidence indicator spec (if Challenge 2 accepted)
- Signal weighting table skeleton (if Challenge 1 accepted)

Ships to Kiro as a single brief replacing overlapping sections of `brief-track-a.md` + `brief-frontend-v2.md`.

### "deck spec"
Tier 1 internal-only artefact structure. Used for:
- Internal partner circulation (Ingram, AWS Partner teams)
- Committee circulation (Austbrokers underwriting, investment IC)
- RFP response attachment (gov, defence, regulated enterprise)

Structure:
- 1-page pentad doc (Track B anchor)
- Cold read frame (how to introduce)
- Substrate slide (one substrate, six surfaces)
- Audience-specific lens slide (swap per room)
- Ecosystem slide (partners, AWS alignment)
- Traction slide (live admin dashboard reference, not static numbers)
- Ask slide (conditional per audience)

Modular: 20–25 master slides, assembled per audience.

### Both
Build spec + deck spec in parallel. Kiro grinds on build spec overnight; deck spec drafted by Claude.ai for John's review.

---

*Convergence locked. Round 5 closed. Awaiting John's pick: build spec / deck spec / both.*
