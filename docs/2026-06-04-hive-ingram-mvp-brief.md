# Hive & Co — Ingram MVP Demo Brief

**For:** Hope McGarry, MD, Ingram Micro ANZ
**Presenter:** John Coates (live narration — the software is a responsive backdrop, not the show)
**When:** Next week (~2026-06-08/12)
**Status:** brief approved-with-refinements (2026-06-04) → build on go

> **This is not a demo they watch. It is a journey they join.**

---

## Stage architecture — the presenter is never the monkey (first principle)

John has run live high-stakes demos for 20 years; the tech has died mid-show and he has carried the room on performance alone. **Not on this build.** The software is architected so it cannot betray him — failure-independence is the foundation, not a fallback:

- **Main screen is local-first** — runs on John's machine; **zero dependency** on EC2, proof360.au, or room wifi for the core five-act demo.
- **No live network call in any render path** — Act 3 uses *real* CORPUS program data, but **snapshotted ahead of time and baked in**: real and survivable *and* impossible to hang on a spinner.
- **Total manual control** — jump to / skip / replay any act instantly; nothing ever waits on a transition or a load.
- **The journey room (phones) is a separate failure domain** — if phones or wifi die, the main screen never notices.
- **Rehearsed with the network physically unplugged.** If everything external is dead, the five acts still run and John still narrates. The tech does the dancing now — not him.

Every decision below inherits this. If a feature can't be made bulletproof under John's hand in the time we have, it doesn't ship.

## The play (one line)

Ingram + AWS want exactly two things: **net-new logos** and **more usage**. proof360 is the **funnel that makes both easier**. The demo shows *only* that funnel; the estate underneath (attestation, CORPUS, the SPV engine) is the **trojan horse** — revealed later, once the inbound-filter seat is held.

**The one belief Hope must leave with:** *"This makes my two funded people look like twenty, it stops ISVs leaking out the side, every routing decision is defensible to AWS — and it's pointed straight at the funnel AWS is paying to fill."*

**The money sentence (the demo's refrain):** *"Every beat in the journey creates either a new AWS logo, more AWS usage, or another company pulled into the AWS funnel."*

**Outward framing on screen:** "from **first AWS workload → enterprise-scale cloud consumption**." John narrates the *"token to IPO"* concept verbally — internal frame, not on-screen label (avoids startup-theatre with an exec).

## Hero + arc — Hive & Co, dual narration

One company, walked from first AWS workload to enterprise scale. Reuses `hive.js`/`demoCompany.js` (INVARIANTS #4). **Every act has two layers** — Hive is hero of the story, Hope is the buyer. The dual narration *is* the demo:

| Act | What Hive experiences (white-hat, agency) | What Hope sees (commercial layer) |
|-----|--------------------------------------------|------------------------------------|
| **1 · Market** | "I'm a honey stall with no digital path." | A net-new logo not yet in the cloud funnel. |
| **2 · Online** | "I need to sell online." | First AWS workload. First usage. First attach opportunity. |
| **3 · Sainsbury's calls** | "I need to pass enterprise due diligence." | proof360 routes the ISV into qualified AWS/Ingram pathways instead of leaking out the side. |
| **4 · Provenance proven** | "I can prove my supply chain." | Usage expands — evidence, data, storage, compute, AI workflows compound. |
| **5 · Provenance → product** | "This becomes a platform." | One logo becomes many logos. |

## Interaction model — shared journey, not passive demo

The demo supports a lightweight **phone participation mode**. John controls the main journey from presenter mode; attendees open a simple mobile URL/QR and join as **Hive & Co** participants.

```
Main screen = theatre.   Phone = participation.   John = narrator.   proof360 = routing intelligence.
```

**Two modes:**
- **Presenter Mode** — John advances the acts on the main screen (keypress/click).
- **Participant Mode** — Hope/team join on phones, see the current act, lightly interact, watch Hive get routed.

**Participant mode is deliberately narrow:**
- shows the current act
- lets the participant choose/confirm the perceived need/gap (e.g. `[Supply-chain provenance] [Retail due diligence] [Cloud readiness] [Data / AI path]`)
- lets them see proof360 route Hive to the next pathway
- optionally lets them shortlist/flag an AWS pathway
- **no auth · no persistence beyond the demo session · single shared room**

Purpose is **not** self-serve onboarding. It is to make Hope/Ingram *feel the funnel* — low-friction entry → guided path → AWS/Ingram routing → defensible recommendation → show-the-work evidence. The line that follows naturally: *"Now imagine this at an event, partner day, or AWS activation workshop — everyone in the room becomes an inbound signal."*

**Hard guardrail — participation is additive, never load-bearing.** Presenter Mode alone is a complete demo. If room wifi or phones fail, John carries the whole thing on voice + main screen, exactly like the wall. Phones are the delighter, not the dependency.

## The HUD — brutally simple

Always on the main screen. Hope's brain keeps returning to *new logos / more usage / defensible routing* — nothing else.

```
Net-new logo: Hive & Co ✓
AWS usage: rising
```

One subtle third line, **Act 3 only**: `Routed pathway: AWS-qualified programs`. No dashboards.

## What we build — a guided theatre surface (not a simulation)

```
John controls the pace.   Each act = one visual change.
The HUD keeps the Ingram/AWS value visible.   Act 3 contains real data.
Everything else is scripted scaffolding that feels responsive to John's narration.
```

1. **Script the arc** — rewrite `hive.js`/`demoCompany.js` into the five dual-layer acts, John's words.
2. **Presenter-driven surface** — John advances each act; the existing `/chat` + report + drawers + VendorShortlist + HUD update one step. No autoplay.
3. **Journey room (participation)** — single ephemeral in-memory room; QR/mobile route; phones reflect the current act + one tap; taps surface on the main screen ("3 chose supply-chain provenance"). Reuses the existing session-store + SSE/poll pattern. Additive only.
4. **Act 3 = the one real beat** — Sainsbury's event → proof360 reads Hive → identifies supply-chain / DD gaps → routes to qualifying AWS/Ingram programs from **real CORPUS program data, snapshotted + baked in (no live call)** → provenance/rationale in the evidence drawer. Real and survivable; cannot hang.
5. **Two-number HUD** — net-new-logo + rising usage across all five acts; pathway line in Act 3.

**Schedule (1 week):** D1–2 script + repoint surface (local-first) · D2–4 journey room (presenter↔phone sync, isolated failure domain) · D4–5 Act 3: snapshot CORPUS data + bake in, make survivable · D6–7 John rehearses palms-on-wall against the room + **network-unplugged run** to prove the tech can't strand him.

## Guardrails

- **White-hat for Hive** (overwhelm → guided pass). **Black-hat (scarcity, loss-avoidance) only in the Hope-facing layer**, never on the founder.
- **Trojan horse stays shut** — never expose CORPUS, VERITAS, SPV engine, ontology, or model lab on screen. Provenance just works.
- **The screen never upstages John** — responsive backdrop, never canned (honours INVARIANTS no-canned-text).
- **Participation additive, never load-bearing** (above).

## Out of scope (deliberate)

Auth · persistence · real self-serve onboarding · multi-company · multi-room · universal domain→model ontology · estate context-compiler. This wins the seat; it is not the product.

## Reuse map

`/chat` surface · `hive.js`/`demoCompany.js` · ThinkingStream · Evidence/Cost drawers · ReportPanel · VendorShortlist · in-memory session-store + SSE/poll (journey room) · CORPUS AWS-program intelligence (Act 3).

---

## Bottom line

The demo does **not** prove the doctrine. It wins one seat: *"Let proof360 be the front-door filter for AWS/Ingram ISV opportunity."* It does it by letting the room *join the journey*, not watch it. Once the seat is held, the horse opens later.
