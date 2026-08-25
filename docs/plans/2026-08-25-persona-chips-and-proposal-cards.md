# Persona Follow-up Chips + Proposal Cards In-Stream Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Checkbox steps.

**Goal:** Live sessions get (1) three live-generated follow-up question chips after each reply — one per persona, grounded in the session record — and (2) pending proposals rendered as persona-attributed cards in the chat stream with one-tap add-to-shortlist.

**Architecture:** New lightweight API endpoint `GET /api/v1/session/:id/followups` (one fast Bedrock call over the record snapshot + last exchange, structured JSON out). Frontend fetches it after each live reply completes and renders `PersonaFollowUps`; separately fetches existing `GET /proposals` after claim-confirms and reply completions, rendering `ProposalCard` in-stream via the existing accept endpoint. Demo mode untouched (canned chips stay demo-only behind `inDemoMode`).

**Tech Stack:** Fastify + Bedrock-direct (`api/src/lib/inference.js`), React/Vite, vitest both sides.

**Branch:** `feat/memory-store-facade` (continues at 2ae0ded).

## Global Constraints (constitutional — INVARIANTS.md + canon rulings)

- **No canned text in live sessions**: every chip question is generated from THIS session's record; generation failure → render nothing (never fallback text). Demo mode (`inDemoMode === true`) keeps the existing canned `FOLLOW_UPS` — do not change demo rendering.
- **Lamp register (canon 2026-08-25)**: chips and cards light ground, never push. No imperative "you should"; proposal cards show the reason on their face. Card verb is exactly **"Add to shortlist"** — the words "buy"/"subscribe" must not appear (ANTI-SELL).
- **Honest degradation**: followups endpoint failure or empty proposals → surface renders nothing; no spinners lingering, no invented content.
- **EXCERPT-NOT-VOICE**: generated questions are the persona's own words ABOUT the record — the generation prompt must not instruct weaving corpus text into the questions.
- Secondary text ≥ `#94a3b8`; gate variable is `inDemoMode` (never raw `isDemoMode`); reuse Chat.jsx inline-style idiom + persona colors `{ sofia:'#a8651e', edison:'#176577', leonardo:'#6b4ea8' }` (note: id is `sofia` in code, display name "Sophia").
- Persona lenses (verbatim from the surface): sofia = "Narrative & trust", edison = "Technical & execution", leonardo = "Strategy & market".

---

### Task 1: `GET /session/:id/followups` (API)

**Files:**
- Create: `api/src/handlers/session-followups.js`
- Modify: `api/src/server.js` (register route after the proposals routes)
- Test: `api/tests/unit/session-followups.test.js`

**Interfaces:**
- Consumes: `getSession(id)` from `services/session-store.js`; `sessionRecordSnapshot(session)` from `handlers/record.js`; the non-streaming inference call from `lib/inference.js` (read it first — use the same call `analyze`/gap paths use, NOT chatStream).
- Produces: `200 {followups: [{persona: 'sofia'|'edison'|'leonardo', question: string}]}` — exactly 0 or 3 entries. `404` unknown session. On inference failure or unparseable output: `200 {followups: []}` (honest empty, never 500, never canned).

**Behavior:**
- Build a compact prompt: company name, current claims (statement + status), open gaps, the last user message + last assistant reply (pass via query of the session's chat history if stored, else omit), and the three persona lenses. Ask for STRICT JSON `{"followups":[{"persona":"sofia","question":"…"}, {"persona":"edison",…}, {"persona":"leonardo",…}]}` — one question per persona, each ≤ 120 chars, each grounded in a named fact of THIS record, phrased as an offer/question (lamp), never an instruction.
- Parse defensively: extract the first `{...}` JSON block; validate persona ids and non-empty questions; anything malformed → `{followups: []}`.
- Cache per session turn: store `session.followups_cache = {turn_key, followups}` keyed on the length of chat history (or last message ts) so repeated GETs for the same turn don't re-bill Bedrock.

- [ ] **Step 1: Write failing tests** — mock the inference lib (vitest `vi.mock`): (a) valid model JSON → 3 validated followups; (b) malformed model output → `{followups: []}`; (c) unknown session → 404; (d) second GET same turn → inference called once (cache).
- [ ] **Step 2: Run tests, verify fail.** `cd api && npx vitest run tests/unit/session-followups.test.js`
- [ ] **Step 3: Implement handler + route registration.**
- [ ] **Step 4: Tests pass; full api suite `npm test` no regressions.**
- [ ] **Step 5: Commit** — `feat(api): live persona follow-ups endpoint — record-grounded, one per persona, honest-empty on failure`

### Task 2: PersonaFollowUps chips (frontend)

**Files:**
- Create: `frontend/src/components/chat/PersonaFollowUps.jsx`
- Modify: `frontend/src/pages/Chat.jsx` (live reply completion path + render site next to the demo-gated FollowUpChips), `frontend/src/api/spine.js` (add `getFollowups(sessionId)`)
- Test: `frontend/tests/unit/PersonaFollowUps.test.jsx`

**Interfaces:**
- Consumes: `GET /api/v1/session/:id/followups` via new `spine.getFollowups`; persona colors/lens labels from the Global Constraints block; existing submit path (`submit(q)`) and @persona convention (`@Edison …` prefix inserts persona routing — read how onPersonaRef composes it and match).
- Produces: `<PersonaFollowUps followups={liveFollowups} onAsk={(persona, question) => …} tk={tk} />`.

**Behavior:**
- Renders nothing when `followups` is empty/null.
- Three chips in a row (wrap on narrow): each shows a small persona dot in its color + display name + the question. Click → `onAsk(persona, question)`; Chat.jsx submits the question routed to that persona (match the existing @persona mechanic — display name in the mention).
- State in Chat.jsx: `const [liveFollowups, setLiveFollowups] = useState([]);` — cleared when a new user message is sent; fetched (fire-and-forget, try/catch → `[]`) after a live assistant reply completes (same place the receipt is pinned, ~line 2071 region); ONLY when `sessionId` is set (live). Render site: alongside the existing FollowUpChips block — demo shows canned (unchanged), live shows `<PersonaFollowUps>`; never both.

- [ ] **Step 1: Failing tests** — (a) empty → renders null; (b) 3 followups → 3 chips with persona names + questions; (c) click fires onAsk with (persona, question).
- [ ] **Step 2: Verify fail; Step 3: implement component + wiring; Step 4: full frontend suite green.**
- [ ] **Step 5: Commit** — `feat(chat): live persona follow-up chips — three lenses, record-grounded, replaces canned chips in live sessions`

### Task 3: ProposalCard in-stream (frontend)

**Files:**
- Create: `frontend/src/components/chat/ProposalCard.jsx`
- Modify: `frontend/src/pages/Chat.jsx` (fetch + render + accept/defer wiring)
- Test: `frontend/tests/unit/ProposalCard.test.jsx`

**Interfaces:**
- Consumes: existing `spine.getProposals(sessionId)` / `spine.acceptProposal(sessionId, proposalId)` (read spine.js:73-80 + the API handler for the proposal object shape — reason: `{trigger_id, claims_cited, discussed_in}`, vendor fields from the register row); existing shortlist refresh (`serverShortlist` — find how it refreshes after shortlist writes and reuse).
- Produces: `<ProposalCard proposal={p} onAccept={…} onDefer={…} busy={bool} tk={tk} />` rendered in the message stream for each pending proposal.

**Behavior:**
- Card: persona attribution header (map the proposal's domain/trigger to a persona — security/compliance/technical → edison; narrative/story → sofia; deal/market/funding → leonardo; default edison) in that persona's color + lens label; the vendor name; the reason ON THE FACE (claims cited, human-readable); two actions: **"Add to shortlist"** (accept → `acceptProposal` → refresh shortlist/panel; disable while busy) and **"Not now"** (defer → local dismiss for the session, no server write unless a defer endpoint already exists — check; if none, local-only).
- Chat.jsx: `const [pendingProposals, setPendingProposals] = useState([]);` — fetched after claim-confirm actions and after each live reply completes (same hook points as Task 2's fetch; batch them); filter out accepted/deferred ids. Rendered after the last message, before PersonaFollowUps. Live sessions only.
- Lamp register: header line style "Edison · Technical & execution" + a quiet lead-in like "This just became visible:" — copy exactly: card title = vendor name, reason text below, no imperatives.

- [ ] **Step 1: Failing tests** — (a) renders vendor, persona attribution, reason; (b) Accept fires onAccept once and disables while busy; (c) "Not now" fires onDefer; (d) copy assertion: rendered text contains "Add to shortlist" and does NOT contain "Buy"/"Subscribe".
- [ ] **Step 2: Verify fail; Step 3: implement; Step 4: suites green.**
- [ ] **Step 5: Commit** — `feat(chat): proposal cards in-stream — persona-attributed, reason on face, add-to-shortlist verb (lamp register)`
