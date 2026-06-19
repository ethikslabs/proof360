# Entity Continuity Model

**Status:** draft
**Date:** 2026-05-25
**Scope:** proof360, ARGUS, and the wider EthiksLabs stack

---

## Why this exists

Static JSON person profiles were the right instinct, but the wrong final shape.

People, companies, and agents are not fixed records. They change through interaction. The system needs to preserve continuity without freezing the subject into one snapshot.

The right model is:

> raw evidence → derived interpretation → canonical record

with privacy and deletion rights preserved where appropriate.

---

## Core idea

An entity is an entity.

That entity may be:
- a person
- a company
- an agent

All three can:
- change over time
- produce artifacts
- carry context
- form relationships
- be queried and updated
- be represented by evidence, not just labels

What changes is not the need for a model.
What changes is the degree of determinism and the evidence available.

---

## Entity types

### 1. Person

Use for a human being.

Store:
- communication style
- preferences
- role/context
- trust boundaries
- interaction history summary
- safe-to-store preferences

Avoid storing:
- unnecessary PII
- sensitive personal detail not needed for the task
- raw private content unless there is a clear operational reason

### 2. Company

Use for a business, SPV, product entity, or operating company.

Store:
- uploaded artifacts
- public signals
- inferred posture
- operating notes
- structured facts such as stage, tooling, compliance posture, or cash-flow signals
- references to source documents

Companies are more deterministic than people because the system can anchor them in filings, decks, docs, and artifacts.

### 3. Agent

Use for a software agent or automated actor.

Store:
- identity
- permissions
- capabilities
- approver / owner
- audit trail
- current state
- allowed actions
- lease or approval status

Agents need stronger determinism because accountability matters.

---

## Storage layers

### Raw layer

Keep the original thing:
- transcript
- uploaded file
- email
- note
- artifact
- prompt output
- scan result

This is the source of truth for later reconstruction.

### Derived layer

Keep the interpretation:
- summaries
- extracted facts
- inferred traits
- risk signals
- relationship notes
- action items

This layer is editable and may change as understanding improves.

### Canonical layer

Keep the current operating record:
- current company state
- current person style/preferences
- current agent permissions
- current project status

This is what the system uses to act consistently.

---

## What gets saved

Save when the information has operational value.

Good candidates:
- a meeting transcript
- a follow-up decision
- a vendor recommendation
- a company artifact
- a person style preference
- an agent approval rule
- an attested fact
- a reusable brief

Do not save everything by default.
Save what helps the next decision.

---

## What should not be over-saved

Avoid turning the system into a surveillance pile.

Do not store:
- raw PII unless necessary
- private detail that does not help the work
- fixed personality claims that ignore context
- stale assumptions pretending to be truth
- repeated copies of the same artifact without reason

The system should learn signal, not hoard noise.

---

## Privacy rule

Separate:
- behavioral style
- sensitive personal data

The system may learn how someone speaks, what they care about, and how technical they are.
It should not need to store private detail just to do that.

If a field can be omitted and the system still works, omit it.

If a field can be inferred later from evidence, do not store it twice.

---

## Deletion rule

If the user owns the artifact, they may delete it.

Artifacts uploaded by a user should be treated as theirs.
The system may keep:
- derived summaries
- audit references
- non-sensitive operational traces

But the original artifact should be deletable when policy allows.

---

## Determinism rule

The more agentic or company-like the entity, the more deterministic the record should be.

Examples:
- person → style and relationship cues
- company → evidence-backed operating state
- agent → permissions and action history

So the system does not replicate the entity.
It maintains continuity from evidence.

---

## Recommended process

1. **Capture raw material**
   - transcript, file, note, scan, or message

2. **Distill into a usable summary**
   - what happened
   - what changed
   - what matters
   - what is next

3. **Write the canonical record**
   - update the entity profile
   - update follow-ups
   - attach references to the source artifact

4. **Route by domain**
   - people
   - companies
   - agents
   - projects
   - follow-ups
   - archive

5. **Preserve provenance**
   - every derived claim should be traceable to source material

---

## Repo mapping

### proof360

Best for:
- company continuity
- structured operational state
- uploaded artifacts
- deterministic inference
- trust posture
- vendor and program context

### ARGUS

Best for:
- monitored services
- edge presence
- alert state
- uptime evidence
- security probes
- operational watch surfaces

### Shared principle

Both repos already point at the same underlying truth:

- entities change
- evidence matters
- raw material and derived meaning are not the same thing
- the system should stay adaptive

---

## Filing rule of thumb

Use the smallest home that can still keep the thing useful.

- A raw meeting transcript belongs in raw capture
- A summary belongs in the relevant entity folder or spec note
- A durable principle belongs in docs/specs
- A live product definition belongs in docs/architecture or dossier
- A design mockup belongs in docs/design

---

## Short version

Do not store a person as a frozen JSON blob.
Store a living record with evidence, context, and privacy boundaries.

Do not store a company as a single snapshot.
Store the operating picture.

Do not store an agent as a loose label.
Store identity, permission, and auditability.

**Concepts dance.** The model should, too.

---

*Drafted from live conversation, 2026-05-25*