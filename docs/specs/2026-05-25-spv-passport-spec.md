# SPV Passport Spec

**Status:** draft
**Date:** 2026-05-25
**Scope:** proof360 / SPV readiness / acquisition-grade company record

---

## Why this exists

A company is not just a name and a website.

For an SPV, the system should be able to answer the full acquisition question:

> If I bought this tomorrow, what am I actually buying?

This passport is the canonical company record for investment, diligence, merger, acquisition, and continuity work.

It should support:
- investor trust portals
- data rooms
- merger / acquisition prep
- enterprise due diligence
- operational continuity
- compliance review

---

## Core principle

An SPV passport is a **portable truth package**.

It contains:
- raw artifacts
- derived facts
- current operating state
- open questions
- evidence references

It must never turn unknowns into fiction.

---

## What the passport covers

### 1. Identity

The legal and commercial identity of the entity.

Fields:
- legal_name
- trading_name
- entity_type
- jurisdiction
- registration_number
- tax_number
- website
- primary_contact
- registered_address
- operating_locations
- formation_date
- status

### 2. Control

Who controls the company.

Fields:
- directors
- officers
- shareholders
- beneficial_owners
- signatories
- delegated_authorities
- board_structure
- voting_rights

### 3. Governance

What rules govern the company.

Fields:
- constitution
- shareholder_agreement
- board_minutes
- resolutions
- delegated_authority_matrix
- approval_thresholds
- reserved_matters
- policy_set

### 4. Financials

What the company earns, spends, owes, and holds.

Fields:
- bank_accounts
- accounting_system
- revenue_model
- cash_balance
- burn_rate
- runway
- liabilities
- receivables
- payables
- tax_status
- financial_statements
- cap_table

### 5. Banking

The operational banking surface.

Fields:
- banks
- accounts
- signatories
- account_purpose
- payment_rails
- cards
- merchant_accounts
- loan_facilities

### 6. Insurance

What risk transfer exists.

Fields:
- policies
- insurers
- policy_numbers
- coverage_types
- renewal_dates
- claims_history
- exclusions
- broker

### 7. Operations

How the company actually runs.

Fields:
- payroll_system
- hr_system
- crm
- billing_system
- accounting_system
- support_system
- vendor_stack
- cloud_accounts
- infrastructure
- data_storage
- admin_tools

### 8. People

Who is involved in the operating reality.

Fields:
- employees
- contractors
- advisors
- board_members
- founders
- external_specialists
- key_contacts

### 9. Contracts

What the company is bound to.

Fields:
- customer_contracts
- supplier_contracts
- partner_contracts
- leases
- NDAs
- SaaS agreements
- service_orders
- transfer_restrictions

### 10. Risk

What can break, stall, or create exposure.

Fields:
- compliance_gaps
- security_gaps
- legal_risks
- operational_dependencies
- concentration_risks
- insurance_gaps
- open_incidents
- due_diligence_flags

### 11. Evidence

Where the truth comes from.

Fields:
- uploaded_documents
- extracted_signals
- public_records
- board_docs
- bank_docs
- insurance_docs
- accounting_exports
- system_screenshots
- attestations

### 12. Open questions

What is not yet verified.

Fields:
- unresolved_items
- missing_documents
- blocked_verification
- pending_approvals
- follow_up_owner
- due_date

### 13. Last verified

How current the record is.

Fields:
- last_verified_at
- verified_by
- source_coverage
- confidence_level
- stale_sections

---

## Storage model

The passport should use three layers.

### Raw layer

Original artifacts:
- PDFs
- spreadsheets
- exports
- filings
- screenshots
- emails
- transcripts
- contracts
- board packs

### Derived layer

Machine or human interpretation:
- extracted fields
- summaries
- inferred posture
- risk flags
- matching logic
- relationship links

### Canonical layer

The current operating record:
- the latest verified state
- the latest accepted interpretation
- the active company profile

---

## Rules

### 1. Preserve provenance

Every derived claim should point back to source material.

### 2. Mark unknowns as unknown

Do not collapse missing data into assumptions.

### 3. Keep history

The record should evolve without losing prior evidence.

### 4. Separate facts from interpretation

A bank account is a fact.
A cash-flow concern is an interpretation.

### 5. Support deletion where appropriate

If the user owns the artifact, deletion rights should be respected where policy allows.

### 6. Do not over-store private detail

Store what helps the work, not what just makes a pile.

---

## Output forms

The same passport should be able to render as:
- investor trust portal
- data room
- acquisition brief
- diligence checklist
- enterprise onboarding pack
- operating company summary

---

## Required questions the passport must answer

At minimum, the passport should let someone answer:

- What is this entity?
- Who owns it?
- Who controls it?
- What does it owe?
- What does it own?
- What systems does it run on?
- What insurance exists?
- What contracts bind it?
- What is missing?
- What evidence proves it?
- What changed since last verification?
- If we bought it, what would transfer with it?

---

## Recommended repo file set

For each SPV or company record:

- `PASSPORT.md` — human-readable canonical overview
- `SOLE.md` — operating rules and repository law
- `EVIDENCE/` — attached source artifacts
- `DERIVED/` — extracted summaries and structured interpretations
- `OPEN_QUESTIONS.md` — unresolved items and blockers

Optional later additions:
- `CAP_TABLE.md`
- `BANKING.md`
- `INSURANCE.md`
- `CONTRACTS.md`
- `PEOPLE.md`

---

## Relationship to proof360

proof360 should be able to generate or hydrate a passport from:
- uploaded artifacts
- public signals
- internal operating docs
- due diligence inputs
- partner data

That is the product direction:

**company evidence in, acquisition-grade passport out.**

---

## Short version

An SPV passport is not a profile.
It is the operating truth of the entity.

It should be good enough for diligence, investment, or acquisition.

*Drafted from live conversation, 2026-05-25*
