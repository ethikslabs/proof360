# NORTH_STAR — proof360

**Role:** Entity onramp — trust readiness diagnostic
**Tier:** 360 — customer-facing product
**State:** Live at proof360.au
**Winning looks like:** A founder submits their company URL. Ten minutes later they understand exactly where their trust gaps are and which vendors can close them. They didn't need a consultant.

---

## What proof360 is

proof360 is the first touch in the trust pipeline. A company URL goes in — Firecrawl scrapes it, Claude Haiku extracts signals, the scoring engine maps gaps against the trust framework, a structured report comes out. Layer 2 (vendor intelligence) unlocks after the email gate. Every gap flagged by proof360 is confirmed in parallel by trust360.

## What proof360 refuses

- No persistence beyond the lead file — no customer database, no user accounts in the product itself
- No opinion on remediation — proof360 diagnoses, it does not prescribe
- No raw AI output — everything is structured through the scoring engine before it reaches the user

## Boundary

proof360 calls: Firecrawl (scrape), trust360 (gap confirmation), VECTOR (inference)
proof360 writes: `api/leads.ndjson` (append-only)
proof360 is called by: no upstream — it is the entry point

## Winning

A reseller embeds the proof360 URL in their sales flow. A prospect runs a scan. The reseller sees the lead in their dashboard. The prospect gets a call. The report was the qualification.

---

*Authority: john-coates*
