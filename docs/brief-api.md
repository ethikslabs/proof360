# proof360 — API brief
**For:** Kiro
**Builds on:** ethikslabs/trust360 (read the codebase before starting)
**Rule:** The frontend contains zero logic. All decisions happen here.

---

## What you are building

A Proof360 API layer that sits between the frontend and the Trust360 engine.

The frontend sends Q&A answers. You translate them into trust evaluation claims, run them through the existing Trust360 pipeline, assemble the results into a structured gap report with vendor recommendations, and return it.

The Trust360 engine (POST /trust) is already built and working. You are not changing it. You are building an adapter on top of it.

---

## The Trust360 engine

Endpoint: POST /trust

Input: { "question": "string (1-2000 chars)", "evidence": "string (optional)", "metadata": {} }

Pipeline: createContext → buildPrompt → runLLMEnsemble → parseOutputs → computeConsensus → buildResponse

Models (parallel, 20s timeout): gpt-4, gpt-3.5-turbo, claude-3-opus-20240229 (UPDATE THIS to current model string)

Output: { traceId, consensus: { mos, variance, agreement }, models: [...], metrics: { executionTimeMs, ... } }

Status codes: 200 (all succeeded), 206 (partial), 400 (validation), 500 (all failed)

---

## Key architectural insight

The Trust360 engine evaluates claims — it does not know what SOC 2 is.

Proof360 translates Q&A answers into claims. Example:

Q&A answer: compliance_status = "none"
Becomes: { "question": "Does this company have SOC 2 Type II certification?", "evidence": "Company self-reported: no formal compliance certification. Target customer: banks. Timeline: 3 months.", "metadata": { "gapId": "soc2", "severity": "critical" } }

Each gap gets one Trust360 call. High MOS = gap is real and significant.

---

## The three endpoints

### POST /api/assess

Request: { "answers": { goal, timeline, target_customer, questionnaire_experience, compliance_status, identity_model, infrastructure, insurance_status, data_sensitivity, blocker_history } }

Your logic:
1. Map answers to gap candidates (see gap mapping table)
2. Build { question, evidence } for each gap
3. Call POST /trust in parallel for each gap
4. Score: mos >= 7 = gap confirmed
5. Compute trust score: 100 - (weighted gap penalty)
6. Select vendors from catalog
7. Store full result in session store
8. Return summary + sessionToken

Response: { sessionToken, summary: { trustScore, readiness, gapCount: { critical, high, medium }, previewGaps (first 2 only) } }

---

### POST /api/gate

Request: { sessionToken, firstName, lastName, email, company }
Logic: validate session exists, validate all fields + email format, store lead (log to file for MVP), mark gatePassed = true
Response: { success: true }
Errors: 400 validation failed, 404 session not found

---

### GET /api/report/:sessionToken

Logic: validate token exists AND gatePassed = true, return full report from session store
Response: { company, assessedAt, trustScore, readiness, estimatedCost, estimatedTimeline, gaps, vendors, meta }
Errors: 404 not found, 403 gate not passed

---

## Gap mapping

| Answer | Gap ID | Severity |
|--------|--------|----------|
| compliance_status: none or unknown | soc2 | critical |
| identity_model: password_only | mfa | critical |
| insurance_status: none or unknown | cyber_insurance | critical |
| compliance_status: none or planning | incident_response | high |
| questionnaire_experience: stalled_deal | vendor_questionnaire | high |
| identity_model: password_only or mfa_only | edr | high |
| identity_model: mfa_only or password_only | sso | medium |

Build evidence from ALL Q&A answers for every claim — full context improves scoring accuracy.

---

## Trust score

Weights: critical=20, high=10, medium=5, low=2
trustScore = Math.max(0, 100 - sum of confirmed gap weights)
Readiness: >= 80 = ready, >= 50 = partial, < 50 = not_ready

---

## Vendor catalog (hardcoded for MVP)

vanta — closes: soc2, incident_response — $7-15k/yr — 6-9 months
okta — closes: mfa, sso — $3-8k/yr — 2-4 weeks
austbrokers — closes: cyber_insurance — $3-10k/yr — 1-2 weeks
cisco_duo — closes: mfa — $2-5k/yr — 1-2 weeks
cloudflare — closes: network_perimeter — $2-6k/yr — 2-4 weeks
crowdstrike — closes: edr — $3-8k/yr — 2-3 weeks
palo_alto — closes: edr — $3-8k/yr — 2-3 weeks

Vendor priority: closes a critical gap = start_here, closes high gap = recommended, else = optional

---

## Framework mapping

banks: soc2, iso27001, apra_cps234, pci_dss
enterprise: soc2, iso27001
mid_market: soc2
smb: basic_controls
government: irap, essential_eight, iso27001
pre_revenue: basic_controls

---

## Session store (MVP — in-memory Map, no database)

Store on /api/assess: { answers, gaps, vendors, trustScore, readiness, gatePassed: false, lead: null, createdAt }
Update on /api/gate: gatePassed = true, lead = { firstName, lastName, email, company }
Sessions expire after 24 hours — TTL check on read.

---

## File structure

proof360/api/src/server.js — Fastify server + routes
proof360/api/src/handlers/assess.js, gate.js, report.js
proof360/api/src/services/gap-mapper.js, trust-client.js, vendor-selector.js, session-store.js
proof360/api/src/config/gaps.js, vendors.js, frameworks.js

Environment: TRUST360_URL, PORT=3001, LOG_LEVEL, NODE_ENV

---

## Do not

- Do not modify Trust360 engine
- Do not build the frontend
- Do not add a database for MVP
- Do not add auth
- Do not add email sending — log leads to file only

---

## Fix in Trust360 first

Update claude-3-opus-20240229 to current Anthropic model string in src/config/models.js

---

*Last updated: 2026-03-13 · ethikslabs/proof360*
