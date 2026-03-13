# proof360 — architecture

## What this is

Proof360 is a founder-facing trust assessment product built on the ethikslabs platform. It takes a founder through a 10-question assessment, identifies trust gaps against relevant compliance frameworks, and recommends a vendor stack to close those gaps — with cost estimates and timelines.

The assessment is the sales motion. The report is the proposal. The human call closes it.

---

## Where this sits in the platform

ethikslabs platform
  └── products/
        └── proof360          ← this repo
              ├── frontend/   ← landing page, Q&A flow, email gate, dashboard
              ├── api/        ← Q&A → Trust360 adapter
              └── contracts/  ← shared API contracts
  └── engines/
        └── trust360          ← separate repo (ethikslabs/trust360)
        └── research360       ← separate repo (ethikslabs/research360)

Proof360 does not contain the reasoning engine. It calls the Trust360 engine via API and renders the result.

---

## Core reasoning chain (Trust360 engine)

Context → Claim → Evidence → Evaluation → Consensus → Report

The Q&A answers become the Context object. Trust360 processes them through its 6-stage pipeline and returns structured gaps and vendor recommendations. Proof360 renders those as the dashboard.

---

## The 10 questions

| # | Question | Context field | Purpose |
|---|----------|--------------|---------| 
| 1 | What's your primary goal? | goal | Shapes urgency weighting |
| 2 | What's your timeline? | timeline | Affects priority ranking |
| 3 | Who do you sell to? | target_customer | Drives framework selection |
| 4 | Have you received a security questionnaire? | questionnaire_experience | Signals active deal risk |
| 5 | Do you have any compliance certification? | compliance_status | Core gap signal |
| 6 | How is user access managed? | identity_model | Identity gap signal |
| 7 | Where is your product hosted? | infrastructure | Cloud provider routing |
| 8 | Do you have cyber insurance? | insurance_status | Insurance gap signal |
| 9 | Do you store or process customer data? | data_sensitivity | Regulatory scope |
| 10 | Has a deal ever stalled on security? | blocker_history | Urgency trigger |

---

## API contract

Proof360 makes one API call to Trust360 per completed assessment.

POST /api/v1/assess

Request context fields: product, version, company_name, goal, timeline, target_customer, questionnaire_experience, compliance_status, identity_model, infrastructure, insurance_status, data_sensitivity, blocker_history

Response fields: trust_score, readiness (not_ready/partial/ready), gaps (id, label, severity, description, frameworks, vendor_ids), vendors (id, name, description, closes_gaps, cost_range, timeline, priority, cta_url), meta (assessed_at, pipeline_version, consensus_score, agreement)

---

## Framework mapping

| Target customer | Frameworks |
|----------------|-----------|
| Banks / financial | SOC 2, ISO 27001, APRA CPS 234, PCI-DSS |
| Enterprise | SOC 2, ISO 27001, vendor risk |
| Mid-market | SOC 2 |
| Government (AU) | IRAP, Essential Eight, ISO 27001 |
| SMB | Basic security controls, privacy policy |

---

## Vendor catalog

| ID | Name | Closes |
|----|------|--------|
| vanta | Vanta | SOC 2, incident response docs |
| okta | Okta | MFA, SSO |
| austbrokers | AustBrokers CyberPro | Cyber insurance |
| cisco_duo | Cisco Duo | MFA (alternative to Okta) |
| cloudflare | Cloudflare | Network perimeter, zero trust |
| crowdstrike | CrowdStrike | EDR |
| palo_alto | Palo Alto | EDR (alternative) |
| apollo | Apollo Secure | Security operations |

---

## Frontend flow

Landing page → Q&A (10 questions) → Email capture (gate) → Dashboard (full report + vendor cards) → Book a call

No login. No accounts. No saved sessions. Email capture is the lead.

---

## Agent roles

| Agent | Role | Owns |
|-------|------|------|
| Kiro | Backend, infra, pipeline | Trust360 engine, API endpoint, AWS deploy |
| Claude | UX, product, architecture | Frontend design, briefs, this document |
| Claude Code | Implementation | Frontend code, API adapter, wiring |
| Codex | Review | Checking Claude Code output against contracts |
| ChatGPT | Second opinion | Stress-testing decisions |

---

## Decisions log

| Date | Decision | Reason |
|------|----------|--------|
| 2026-03-13 | Named product Proof360 | Prove is the process, Proof is the artifact a founder hands to an investor |
| 2026-03-13 | One API call to Trust360 per assessment | Simplest integration, all reasoning stays in the engine |
| 2026-03-13 | Email capture gates the full report | Email = lead. Report is the value exchange. |
| 2026-03-13 | No login for MVP | Reduces friction. Return visits are v2. |
| 2026-03-13 | docs/ as coordination layer | Every agent reads briefs here. Prevents drift across sessions. |

---

## What is not in this repo

- The Trust360 reasoning engine → ethikslabs/trust360
- The Research360 engine → ethikslabs/research360
- Platform core schemas → ethikslabs/ethikslabs-core
- Infrastructure / Terraform → handled by Kiro in Trust360 repo

---

*Last updated: 2026-03-13 · Maintained by JP Coates / ethikslabs*
