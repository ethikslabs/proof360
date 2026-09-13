# BRAIN.md — the proof360 method

**Authority:** john-coates · **Standard:** `../CONTROL/standards/method-document.v1.md` (13 Sept 2026)
**Written:** Sun 13 Sept 2026, Claude Code (Edison), at proof360 `2bf544e`. **Reader:** Sarvesh.
**Rank:** sits beside `WHY.md`, `INVARIANTS.md`, `NORTH_STAR.md`; outranks `NORTH_STAR.md` where they disagree until that file is rewritten.

> proof360 is not the code. It is the way John reads a company and introduces people, and the
> code is what stops that drifting. The Latins (CORPUS, FORUM, PULSUS) can move as code because
> the code is the whole truth of them. proof360 moves as **this file, then the tests that pin it,
> then the code**, in that order. Refinement is a change to a sentence here first; the diff of the
> sentence travels on the handover rail before the diff of JavaScript. Never the reverse.

---

## How to read a row

Every law is stated three ways, or it is not stated:

1. **The law**, in John's words, one sentence.
2. **The channels it binds.** proof360 speaks to a founder through six channels. A law that
   binds one can be broken in the other five without touching the file that holds it.
3. **The test that pins it.** A named test that reads the real artefact and fails when the law is
   broken. Where there is none, the row says **no test**. A blank cell would read as "fine"; an
   explicit "no test" reads as work.

The **standing** column is what was true at `2bf544e`, re-taken at point of use, never copied.

### The six channels

| Channel | Where it lives |
|---|---|
| **Reading** | `api/src/services/cold-reading.js` (the deductive read and its prompt), `inference-builder.js`, `context-normalizer.js`, `gap-mapper.js` |
| **Interview order** | `frontend/src/components/chat/Interview.jsx` `ASK_ORDER`, duplicated on the API side on purpose |
| **Persona prompts** | `api/src/services/persona-prompts.js` |
| **Gap copy** | `api/src/config/gaps.js` — each gap's `why`, `risk`, `peer` lines |
| **Register triggers** | `api/src/config/capability-register.json` via `trigger-evaluator.js`; the shortlist latch in `shortlist.js`; `vendor-selector.js` |
| **UI labels** | `frontend/src/components/chat/*` — `OurWorking.jsx`, `Bubble.jsx`, `HowWeReadThis.jsx`, anchor chips, receipts; `frontend/src/rendering/*` |

---

## The laws

| # | Law (John's words) | Channels bound | Pinned by | Standing at `2bf544e` |
|---|---|---|---|---|
| 1 | **Read the business before the wiring.** Never open on a technical fact. | reading · **interview order** | **no test** | **Ruled, not built.** John, 13 Sept: "start with the business, always — we are here to help you raise and get enterprise buyers … not cloud straight away, anyone can do that." `ASK_ORDER` still opens on `infrastructure.cloud_provider` (`Interview.jsx:35`). The reorder is owed; the pinning test is `interview-flow` extended to assert the first ask is a business field. |
| 2 | **The reading is a reveal, not a verdict.** Three beats: clues flat, one connection, an invitation to correct. | reading | **no test** | Holds in the reading (`cold-reading.js` `buildReadingContext`). Nothing fails if the beats are reordered. |
| 3 | **Hedge words are bound to evidence grade.** "We can see" / "it looks like" / "our research suggests". Anything ungraded is not said. | reading · personas · UI labels | `api/tests/unit/cold-reading.test.js` ("ABSENCE RULE: a failed DNS lookup must never anchor as *we can see*") · `frontend/tests/unit/grade-words.test.js` (grade language, never a percentage) | Holds in the reading and the grade words. Personas inherit graded facts but nothing checks their hedge — **unpinned in that channel, say so.** |
| 4 | **Never evaluate them.** No score, no grade, no "sources disagree". | reading · **personas** · **gap copy** · UI labels | `api/tests/unit/persona-prompts-no-grade.test.js` (numbers reaching a persona) · `frontend/tests/unit/no-scores.render.test.jsx` · `journey-no-scores.test.jsx` · `HowWeReadThis.test.jsx` (the arithmetic is opened by choice, labelled method) | **Partly breached in the trusted voice.** For an *observed* gap, `persona-prompts.js` still pushes `Why it matters: ${g.why}` from `gaps.js` into every persona, so market consequence arrives in Leonardo's mouth. **Ruled 13 Sept as structure:** a default butler voice gives the first read and introduces the team; cost and consequence sit in the recommendations depth, never in the first read. Not built. Residual: which specialist carries the cost line. Absences no longer carry any `why` (see 5). |
| 5 | **Absence of evidence is never evidence of absence.** Found / honest zero / could not look are three states, and "not seen" is never "you lack". | reading · **personas** · **gap copy** · **register triggers** · **UI labels** (receipts, opener, ledger) | `api/tests/unit/absence-not-observed.test.js` (every hop: inference → normaliser → gap state → prompt block; receipt keeps `null` ≠ `[]`; score, vendor, active-gap, opener doors) · `chat-receipts.test.js` · `session-chat-grounding.test.js` · `register-advisory.test.js` ("the honest zero is an answer, not an apology") · `frontend/tests/unit/absence-not-observed.render.test.jsx` · `OurWorking.test.jsx` | **Pinned 13 Sept (HX fix 1, commits 5123f4b · 83a431f · 2bf544e).** An absence travels as `state: 'not_observed'`: it is filtered out of "Gaps identified", carries no weight, buys no vendor, never enters the active-gap block, and the receipt says *could not look* rather than *no sources retrieved*. The seat-walk of 12 Sept (beat 4, "Uneasy") is the case; the re-walk is the gate. |
| 5a | **The absence register is the spoken line:** "Companies like yours usually go for X to achieve Z, and use Y to get there. We didn't see one on your pages. Do you have it?" *"This is how I speak in human."* (R6, 13 Sept) | personas · gap copy · UI labels (opener) | `api/tests/unit/peer-reference.test.js` (every slot derived; null when the cohort was not observed or does not usually go for X; never "need" / "your gap"; stake disclosed) | **Built and live.** `api/src/services/peer-reference.js`. The data it draws from: cohort map + framework labels (`cold-reading.js`), `FRAMEWORK_MAP` (`config/frameworks.js`), `VENDORS` with `is_partner` / `deal_label` (`config/vendors.js`), `peer{}` on each gap (`config/gaps.js`). **Change the sentence by changing the table, never by editing the prompt.** |
| 6 | **A wrong company confidently described is the worst output.** Identity resolved once, before anything speaks. | reading | `api/tests/unit/holding-identity.test.js` · `domain-preflight.test.js` · `resolve-founder-atomic.test.js` | Holds. |
| 7 | **Infer first, then ask one thing, once.** Not knowing is an answer. | interview order · reading | `api/tests/unit/interview-flow.test.js` ("I don't know" is a first-class answer; an answered claim is never asked again) · `confirm-ask-fatigue.test.js` (stops asking a question nobody is answering) | Holds as mechanism; three answers wired (yes / correct / don't know). |
| 7a | **The ability to answer is the read.** A short ladder of questions only the real role can answer; an unanswered rung is a *state* on the record, never a verdict, and the judgment stays in John's head. ("Are you an investor? What industries? What stage? What ticket size?") 13 Sept. | interview order · reading · personas | **no test** | Ruled as method, not yet expressed as a ladder in the interview. The follow-up questions are the founder's ladder today; the closing question of 5a is one rung of it. Intake for partners and investors should run the same shape. |
| 8 | **What the founder says outranks what the machine inferred, permanently.** | memory kernel (every channel reads it) | `api/tests/unit/override-stack.test.js` · `api/tests/memory/engine-invariants.test.js` | Holds. |
| 9 | **Never pitch before they have spoken.** A decline is remembered forever. | **register triggers** · shortlist | `api/tests/unit/trigger-evaluator.test.js` (confirmed claims only, D4) — pins the evaluator, not the latch | **A latch, not a gate.** 40 of 70 register entries are gap-kind ("Surfaces when CER shows open gaps") and fire on derived gaps with `claims_cited: []` once any single testimony opens the lane. Since 13 Sept an *absence*-derived gap no longer selects a vendor (5), which closes the worst case; observed-but-unspoken gaps still surface vendors. Unruled: whether a gap-kind trigger needs a founder word. |
| 10 | **A witness with a stake, never a neutral oracle.** Our commission is disclosed. | register · shortlist · personas · gap copy | `api/tests/unit/tier-boundary.test.js` (free sorts first, server-side) · `peer-reference.test.js` (partner stake in the sentence) | Holds. |
| 11 | **Show the working, never name the machinery.** Nobody hears "corpus". | reading · personas · **UI labels** | `api/tests/unit/chat-receipts.test.js` (the working is recorded) — **no test for the word** | **Breached in the chrome.** The prompt may not say "corpus"; `OurWorking.jsx:17` titles the citation card "Corpus holding" and `cold-reading.js:258` labels the anchor the same. `Bubble.jsx` already carries the comment explaining why not. One rename and one source-level test (grep the rendered strings for the word) closes it. |

---

## What the code decided that John never ruled

Nine decisions an engineer made that shape what a founder feels. None is wrong on its face; each is a one-word ruling (keep / change / strike). Two are now ruled (1, 4 above). The rest, from the 7 Sept audit (`_working/2026-09-07-johns-brain-proof360-what-the-code-thinks.md` §"Where the code decided something you never ruled"): the vendor pick order, which persona answers by default, the token caps, the dollar figures in the gap copy, Sophia's "coach-like", the shortlist latch (9), and which specialist carries the cost line (4). Do not build on any of them as if they were the method.

## Seventeen rules the code holds that no canon states

They came out of live walks and were never written where a reader could find them. A rewrite loses them first. They are listed in the same audit under "Where the code is ahead of your written canon" and are to be promoted into a canon file before proof360 is refactored. This file will carry them as rows when they are ruled.

---

## The transfer test

Before this file is handed over, a reviewer who did not write the code is asked for three
plausible edits a competent maintainer would make that break a law without touching the file
this document names for it. Three found means the method lives in the wrong room.

- **Run 1, 12 Sept (Grok):** three found at once — reorder `ASK_ORDER`, add a gap-kind register entry, rename a UI label. The document then named one channel in six. Corrected by the channel column above.
- **Run 2, 13 Sept (a second model, on HX fix 1):** four doors found the first cut had missed — the pen-test gap, the ledger panel, the vendor selector, the active-gap block — all closed the same day (`83a431f`). That review is why Law 5 lists five channels, not two.
- **Run 3:** owed before this file leaves the repo.

---

## How this file changes

1. John changes a sentence here. The commit message names the law: "Law 7 changed: …".
2. The pinning test changes in the same commit, or the row says "no test" until it does.
3. The code follows, in its own commit, referencing the law.
4. The diff of this file is what lands on the Sarvesh rail (Trello card → this file). The changelog (`docs/CHANGELOG-SARVESH.md`) says what exists; a walk (`walks/<date>-<topic>/`) says why it matters as felt, beat by beat, before and after.

*Why it is important, in one sentence:* every law here is a place where a founder either feels seen or feels marked, and the difference is not in the code.
