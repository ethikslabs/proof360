# NORTH_STAR — proof360

**Role:** Trust gap engine and commercial routing layer  
**Tier:** 360 — customer-facing product  
**State:** Live at proof360.au  
**Authority:** john-coates  

---

## The flywheel

proof360 is not a diagnostic tool that happens to recommend vendors. It is a **commercial routing engine** with a diagnostic front door.

```
proof360 cold-reads a company
  → identifies trust gaps
  → maps gaps to vendors
  → routes the transaction

If not on AWS:
  → recommend migration (MAP funding available)
  → customer lands on AWS with EDP commitment
  → sell vendor stack via CPPO against committed spend

If on AWS (Activate / EDP):
  → sell vendor stack via CPPO against committed spend
  → every purchase burns existing commitment — no new budget conversation

If pre-AWS (early stage):
  → route to AWS Activate (credits, no EDP yet)
  → plant the flag — EDP conversation comes at Series A
```

Every gap proof360 identifies has a vendor. Every vendor has a transaction path. That path is either direct, CPPO via AWS Marketplace, or distributor (Ingram/Dicker). CORPUS holds the intelligence on which path applies.

---

## What winning looks like

A founder submits their company URL. Ten minutes later they know exactly where their trust gaps are. The report recommends specific vendors with specific programs. If they're not on AWS, migration is the first recommendation — MAP funds the project, proof360 earns on the referral. Once on AWS, every subsequent vendor recommendation is a CPPO against their EDP commitment. The reseller (proof360) earns margin on every transaction without holding inventory, managing credit, or writing a proposal.

The report was the qualification. The gap was the sales motion. The EDP was the budget. The CPPO was the close.

---

## What proof360 is

- The entry point for the trust pipeline
- A cold-read engine: URL in → signals extracted → gaps scored → vendor recommendations out
- A commercial layer: every recommendation has a routing path (CPPO / direct / distributor)
- A reseller front door: the report qualifies the prospect and initiates the vendor transaction

## What proof360 refuses

- No raw AI output — everything structured through the scoring engine before it reaches the user
- No opinion without evidence — every gap claim is supported by CORPUS citations
- No vendor recommendation without a transaction path — if there's no route, it's not in the report

## The substrate

**CORPUS** is the knowledge layer proof360 queries for vendor intelligence. Vendor programs, startup credits, CPPO availability, pricing tiers, AU distribution paths — all ingested and vectorised. proof360 does not hardcode vendor data; it queries CORPUS at runtime.

**AWS programs** are first-class routing signals:
- `aws_program_enrolled` → already in ecosystem, CPPO is the path
- Not enrolled → Activate (early stage) or MAP migration (established)
- EDP commitment detected → CPPO urgency — help them spend committed dollars

## Boundary

proof360 calls: CORPUS (evidence + vendor intelligence); inference is Bedrock-direct (EC2 instance role, keys in SSM). trust360 is retired — gap evaluation lives inside proof360.  
proof360 writes: `api/leads.ndjson` (append-only)  
proof360 is called by: no upstream — it is the entry point  

---

*Last updated: 2026-05-24*  
*Authority: john-coates*
