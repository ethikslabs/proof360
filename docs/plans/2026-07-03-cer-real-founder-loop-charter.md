# Project Charter — proof360 CER: from merged slice to a real, governed founder loop

**Date:** 2026-07-03
**Authority:** john-coates (signed off in-session 2026-07-03, Claude Code session 20260703004746-3391)
**Status:** ACTIVE — D1→D4 approved as scoped; slight modification allowed as we go, re-sign-off on scope changes

---

## Goal

A founder walks `/chat`, the CER pathway assembles conversationally, missing fields are
asked for by the owning lens and captured without stranding them — and the surface serves
**their** founder record, not the demo founder. Every step verified live on proof360.au,
in a browser, as the persona.

## Deliverables

| # | Deliverable | Acceptance (verifiable, not asserted) |
|---|------------|--------------------------------------|
| D1 | PR #6 merged + deployed | Merged to main, CI green, deployed to EC2, `/health` 200, gap-prompt walked live in a browser: name-reply captured as fact, URL-reply hands to cold-read |
| D2 | Website-reply robustness (the 2 deferred Codex P2s from PR #6) | Embedded domain in a sentence ("we're at northwind.io") recognised; `awaitingField` stays armed until the cold-read actually fills company, re-prompts on failure — tests + live walk. Board ref: PROOF360-CER-WEBSITE-REPLY-001 |
| D3 | Real founder→atom resolution | Logged-in founder's `/journey` + CER read their own atoms; `DEMO_FOUNDER_MODE` no longer the public prod posture. Gated on John's auth-in-front ruling (see D4) |
| D4 | Decision briefs for the 3 tentpoles | Auth-in-front, CORPUS F2 leak, redaction-matrix — one-page brief each with options + recommendation, John rules in-session |

## Out of scope (unless John pulls it in)

- Scoring convergence (PROOF360-SCORING-001)
- Memory-v2 atom cutover (PROOF360-MEMORY-V2-CUTOVER-001)
- React-compiler lint refactor (PROOF360-LINT-REACT-COMPILER-001)
- Anything Markerly (owned by a parallel thread this session)

## Working method

Step-by-step, deep: explain exact lines before edit, John acknowledges before each build
step, @codex review before merge (cross-vendor reviewer invariant), verify live in browser
before claiming done. Done = live-verified + handoff, not merely committed.

## Evidence base at charter time

- PR #6 CI green (API + Frontend), 70/70 frontend tests; 4 Codex P2s: 2 fixed in
  `1eb6b6c`, 2 deferred by recorded decision to the D2 slice.
- Branch 10 ahead of main; main 1 ahead of branch (mergeability confirmed at D1).
- `/journey` + CER live on prod but serving the demo founder (`DEMO_FOUNDER_MODE=true`).
