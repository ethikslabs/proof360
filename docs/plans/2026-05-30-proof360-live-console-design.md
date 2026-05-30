# proof360.au/live — "Show the Work" Verification Console

**Date:** 2026-05-30
**Status:** Design — approved by John, pre-implementation
**Author:** claude-code
**Repo:** proof360

---

## 1. Purpose

A public, on-brand page at **proof360.au/live** where a visitor interrogates the *running* trust
substrate instead of reading claims about it. The visitor sees a real attested receipt, triggers
the real machinery (mint / tamper / probe / attest-your-own-claim), hands the agent their own
claim, and gets answers from an agent that stays honest about what is LIVE versus SPEC.

Origin: this is the public, interactive form of the "receipts over philosophy" convergence thread.
Primary first user is **Sarvesh** (CTO, skeptic, convergence partner); the page is built
public-grade so it doubles as an **investor / enterprise-DD "show the work" demo**.

**Key property:** putting the receipt render on proof360.au makes the page itself **hop 4** of the
tetrad — `CORPUS declares → VERITAS attests → Guard enforces → proof360 renders` — closing the
4-of-4 that the 2026-05-30 hand-stitch demo was one hop short of.

---

## 2. Goals / Non-Goals

### Goals
- Let a visitor see and verify a **real** attested receipt (sha256, hash-chained, tamper-evident).
- Let a visitor **trigger the real machinery live** in a sandbox: mint, tamper, probe, attest.
- Let a visitor hand the agent an **arbitrary claim** and watch it be attested honestly — returning
  `Unknown` when there is no evidence (the system refusing to rubber-stamp is itself the proof).
- An agent (Claude via Bedrock) that answers grounded in real tool outputs and **never overclaims**.
- Honesty survives the polish: the page discloses the SPEC gap (`VERITAS-CORPUS-001`) and the
  LIVE/SPEC ledger, prominently.
- Demo doubles as a funnel: soft email-gate after a few agent turns → SIGNUM lead.

### Non-Goals (YAGNI)
- No login / account creation for the core experience (public, rate-limited).
- No writing to canonical VERITAS store, Guard ledger, or CORPUS — everything is ephemeral.
- Not building the real automated CORPUS→VERITAS wire here (`VERITAS-CORPUS-001` stays a separate
  ticket). This page demonstrates the components honestly; it does not close the SPEC gap.
- Not reusing the existing `/chat` agent path (still carries P3 mocks). `/live` is clean.

---

## 3. Architecture

Everything lives **inside proof360** and deploys as one unit. proof360 api on `:3002` (EC2),
React SPA frontend, new `/live` route.

### 3.1 Frontend — new `/live` route (React)

Four zones:

1. **Receipt card** — a real Attested receipt front and centre: `receipt_id`, claim text,
   `state: Attested`, `receipt_hash`, witness ref, `chain ✓`.
2. **Action buttons** — `Mint a fresh receipt` · `Run tamper test` · `Probe the live stack` ·
   `Attest your own claim` (text input).
3. **Agent pane** — chat with Claude (Bedrock), tool-using, narrates each action with honest caveats.
4. **Persistent honesty banner** — *"Real code, ephemeral sandbox. The CORPUS→VERITAS join shown
   here is hand-wired (VERITAS-CORPUS-001, in build). Nothing here writes to canonical state."*
   Plus a visible LIVE/SPEC two-axis ledger.

On-brand chrome; contrast per HX rules (primary `#f1f5f9`, secondary `#94a3b8` min, never
`#334155` for visible text; no ultra-dark low-contrast).

### 3.2 Backend — sandboxed "attestation lab" (proof360 api)

All handlers run the **real** VERITAS/Guard code against **ephemeral, per-session** state
(in-memory ReceiptStore + tmp ledger keyed by session id, GC'd on TTL). Zero canonical writes.

| Endpoint | Does |
|----------|------|
| `POST /api/lab/mint` | sample CORPUS claim → VERITAS `attest()` → Guard audit ledger → returns receipt + `verifyChain` |
| `POST /api/lab/tamper` | mutate the session's ledger → returns `verifyChain` true→**false** + breaks-at-sequence |
| `POST /api/lab/attest` | visitor claim text → honest state (`Unknown` w/o evidence, `Inferred` w/ proof no source) → leak-gradient + length cap on output |
| `GET  /api/lab/status` | curated LIVE/SPEC two-axis ledger from **safe server-side** probes (never exposes raw internal ports to the public) |

**Vendored deps** (pinned, with provenance note) so proof360 deploys standalone:
- `proof360/vendor/veritas-dist/` — pinned copy of `VERITAS/dist`
- `proof360/vendor/guard-audit/audit-log.js` — pinned copy of `IMPERIUM/guard/audit-log.js`
- `proof360/api/fixtures/corpus-claims/` — a couple of **real public** CORPUS claim objects
  (e.g. the Microsoft `$150k Azure credits` claim), labelled as sample fixtures.

### 3.3 The agent — `POST /api/agent` (Bedrock Claude, tool-use)

- Tools: `lab_mint`, `lab_tamper`, `lab_attest`, `lab_status`, `get_artifact`.
- Grounding: tool outputs only — the agent cannot assert what a tool did not return.
- System prompt hard-codes the **honesty contract**: mark LIVE vs SPEC; disclose the hand-stitched
  CORPUS→VERITAS join; never claim the automated pipeline exists; name `Unknown` attestations as
  the no-rubber-stamp feature.
- Direct **Bedrock** inference (John default; P9 direct-inference ruling). No VECTOR dependency,
  no `ANTHROPIC_API_KEY`.
- **Rate-limited** (IP). **3 free agent turns → soft email-gate** → proof360 `capture-email`
  handler → SIGNUM lead. Action buttons remain usable while throttled.

---

## 4. Data flow (one interaction)

```
visitor → /live → clicks action OR asks agent
  → frontend POST /api/lab/* (or /api/agent → tool call)
    → handler runs REAL VERITAS/Guard in ephemeral sandbox
      → returns artifact JSON (receipt / ledger / chain status)
        → UI renders it  ← this render IS proof360 hop 4
          → agent narrates with honest LIVE/SPEC caveat
```

---

## 5. Security / abuse

- **Ephemeral sandbox**: per-session in-memory store + tmp ledger, TTL GC. No canonical mutation.
- **Input hardening** on `/api/lab/attest`: length cap, leak-gradient (`checkForLeaks`) on output.
- **No raw topology exposure**: `/api/lab/status` returns a curated LIVE/SPEC summary, not raw
  internal `/health` ports.
- **Rate limiting** on `/api/lab/*` and `/api/agent` (IP-based).
- **Email-gate** after 3 agent turns (cost + funnel); no PII stored beyond the captured email →
  SIGNUM, consistent with existing proof360 capture-email behaviour.

---

## 6. Constraints honored

Bedrock default · P9 direct-inference ruling · no-mocks INVARIANT (everything real) ·
labelled-sandbox INVARIANT #4 · contrast HX rules · push-before-deploy rule · one-front-door.

---

## 7. External dependency to action (John / AWS)

proof360's EC2 instance role needs **`bedrock:InvokeModel`**. Per workspace warnings,
`GitHubActionsClaudeRole` is scoped to `ethikslabs-workspace-control` only — the proof360 instance
role likely needs its own Bedrock grant before `/api/agent` works. This is a John/AWS action;
the rest of the build can proceed and be verified against a stub until the grant lands.

---

## 8. Build sequence

1. **Vendor** pinned `VERITAS/dist` + Guard `audit-log.js` + real public CORPUS claim fixtures into
   proof360 (provenance noted).
2. **Lab service module** (sandbox runner) + 4 handlers. Unit tests:
   - mint → state `Attested`, `verifyChain` true
   - tamper → `verifyChain` flips true→false, breaks at altered sequence
   - attest arbitrary text (no evidence) → `Unknown`; (proof, no source) → `Inferred`
   - leak-gradient blocks a planted secret in attest output
3. **Agent endpoint** `/api/agent`: Bedrock tool-use loop + honesty system prompt + rate-limit +
   3-turn email-gate → SIGNUM. (Verify against a Bedrock stub until IAM grant lands.)
4. **Frontend `/live`** console: receipt card, action buttons, agent pane, honesty banner,
   LIVE/SPEC ledger. On-brand, contrast-compliant.
5. **Tests + deploy**: `git push origin main` BEFORE `deploy.sh` on EC2; add `/live`; proof360 is
   already under ARGUS watch.

---

## 9. Testing strategy

- Handler unit tests as in §8.2 (deterministic — sandboxed machinery).
- Agent endpoint: tool-routing test (claim → correct tool), honesty-contract test (system prompt
  forbids overclaim), rate-limit + email-gate test.
- Frontend: route renders, button → handler round-trip, receipt card reflects real artifact.
- Manual: the honey/Sarvesh walkthrough — mint, tamper (watch break), attest a junk claim
  (watch `Unknown`), ask the agent "is this real or a mock."

---

## 10. Open questions / risks

- **Bedrock model id** for the agent (Opus vs Sonnet via Bedrock) — pick on cost/latency; Sonnet
  likely fine for narration.
- **Vendoring drift**: pinned VERITAS dist can fall behind the source repo. Acceptable for a demo
  lab; note the pinned version + commit in the vendor provenance file.
- **CORPUS fixture honesty**: fixtures are real public claims but static; the agent must say
  "sample CORPUS claim," not imply a live CORPUS read.
```
