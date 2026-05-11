# proof360 — Onboarding HX Requirements

**Status:** requirements amendment  
**Date:** 2026-05-09  
**Scope:** founder onboarding, live extraction, signal confirmation, report language  
**Authority:** John Coates  

---

## Product law

proof360 does not ask founders to prove vocabulary. It shows a live read, lets them change assumptions, and adapts explanation density to the human in front of it.

The onboarding flow must assume competence in the person, not familiarity with startup, compliance, cloud, or procurement language.

The product is testing company readiness, not the founder's vocabulary.

---

## Explanation-density choice

At the start of onboarding, proof360 must offer a simple preference:

```text
How should we show this?

Help me through it
Explain the terms as we go.

Just show me
I know what I'm looking at.
```

This is not a persona test and not a skill ranking. It only changes explanation density.

### Mode behavior

| Mode | Behavior |
|---|---|
| Help me through it | Translate terms inline, explain why each assumption matters, avoid jargon-first labels. |
| Just show me | Show compact signal labels, values, evidence state, and Change it actions. |

Both modes use the same evidence, signals, scoring, gaps, and report logic.

---

## Delivery order: CLI first, page second

The canonical onboarding interaction must be proven in a CLI before it becomes a page.

The CLI is the first renderer of the product contract. It proves:

- the live read
- the assumption sequence
- `Confirm` / `Change it`
- `Help me through it` / `Just show me`
- `Not sure` as a valid correction state
- signal state transitions
- report consequence language

The web page is a later renderer of the same contract, not the source of truth for the experience.

This keeps the product honest: if the conversation model, signal contract, and copy do not work in a plain terminal, visual design should not hide that.

---

## Assumption-first flow

proof360 must present inferred signals as editable assumptions, not as a questionnaire.

Required pattern:

```text
Looks like <assumption>.

Confirm
Change it
```

Examples:

```text
Looks like you're hosted on AWS.

Confirm
Change it
```

```text
Looks like you sell to larger companies.

Confirm
Change it
```

```text
Looks like you handle customer data.

Confirm
Change it
```

The founder corrects the read. They are not interrogated by the system.

---

## Change it behavior

`Change it` is an agency action, not an error state.

When selected, it opens concrete alternatives and may include `Not sure` as a valid answer.

Examples:

| Assumption | Change options |
|---|---|
| Hosted on AWS | AWS / Azure / Google Cloud / Mixed / Other / Not sure |
| Behind Cloudflare | Cloudflare / Fastly / Akamai / Other / None / Not sure |
| Selling to larger companies | Enterprise / SMB / Consumer / Mixed / Not sure |
| Handles customer data | Personal data / Financial data / Health data / No sensitive data / Not sure |
| Funding stage | Just getting started / Finding repeat customers / Growing fast / Selling to larger customers / Not sure |

`Not sure` remains useful, but it is not the primary posture. The primary posture is: proof360 has made a read, and the founder can change it.

---

## No vocabulary test

Onboarding must never require the founder to understand terms like:

- Series A
- SOC 2
- DMARC
- SPF
- CSP
- HSTS
- APRA
- IRAP
- PCI DSS
- HIPAA
- procurement
- channel partner

If a term is necessary, proof360 either translates it in `Help me through it` mode or exposes it only as the compact label in `Just show me` mode.

Examples:

| Internal label | Help me through it | Just show me |
|---|---|---|
| stage: seed | Looks like you're finding repeat customers and starting to prove the business can repeat. | Stage: Seed. Change it. |
| customer_type: enterprise | Looks like you sell to larger companies, which can trigger security reviews and procurement checks. | Customer motion: Enterprise B2B. Change it. |
| dmarc: missing | Looks like your email domain may be easier to spoof. That can matter in buyer security reviews. | DMARC: Missing. Change it. |
| soc2: absent | Looks like larger buyers may ask for a formal security report before they approve you. | SOC 2: Not evidenced. Change it. |

---

## Signal state model

Every founder-facing assumption should carry a state:

| State | Meaning |
|---|---|
| inferred | proof360 found evidence and made a read |
| confirmed | founder accepted the read |
| changed | founder corrected the read |
| not_sure | founder could not confirm the read |
| contradicted | public evidence and founder answer conflict |

These states must be visible in the report language where they affect confidence.

`not_sure` is not a failure. It is a routing signal: proof360 should explain what can be checked publicly and what may require owner confirmation later.

---

## Copy rules

- Do not shame the founder.
- Do not imply ignorance when a founder does not know a term.
- Do not ask jargon-first questions when an assumption-first version is possible.
- Do not hide uncertainty behind a confident sentence.
- Do not use "expert mode" or beginner/expert labels.
- Prefer "Change it" over "Edit" when correcting an assumption.
- Prefer "Looks like..." for inferred reads.
- Prefer "We found..." only when there is concrete evidence.
- Prefer "Not evidenced" over "missing" when absence of public evidence is not proof of absence.

---

## Acceptance criteria

- A founder can complete onboarding without knowing startup, compliance, cloud, or procurement jargon.
- A fluent operator can complete onboarding without being taught basics.
- The first onboarding preference is `Help me through it` vs `Just show me`.
- Every inferred founder-facing signal has `Confirm` and `Change it`.
- `Change it` always returns agency to the founder and never reads as a mistake.
- `Not sure` remains available inside correction flows where appropriate.
- The first implementation target is a CLI onboarding flow.
- The web onboarding page renders the same contract after the CLI proves it.
- Explanation-density mode changes copy and disclosure depth only.
- Explanation-density mode does not change scoring, evidence, signal state, gap logic, vendor routing, or program matching.
- Report language distinguishes inferred, confirmed, changed, not-sure, and contradicted states where confidence depends on them.

---

## Design intent

HX first means proof360 meets the human where they are.

Some founders know the labels. Some know the business but not the labels. Some know neither yet. Some know more than the system. The product must handle all four without changing its respect for the person.
