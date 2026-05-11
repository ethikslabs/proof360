# Proof360 — Vendor Intelligence Brief

## What this is

The vendor intelligence layer surfaces inside the report (Layer 2, post email gate) for each gap detected. It gives the founder a research-backed landscape of options for closing that gap — with Proof360's own recommendation, transparent referral disclosure, and a discount where a partner arrangement exists.

This is not a comparison site. It is curated decision support. The product's job is to reduce cognitive load at the exact moment a founder is most likely to act.

---

## Core principles

1. Show all vendors neutrally. Never hide non-partner options.
2. Label Proof360 deals clearly. Green chip: "Proof360 deal" on the quadrant dot and the vendor card.
3. Recommendation is context-aware. The "our pick" changes based on stage, stack, and gap severity.
4. Dogfooding disclosure is mandatory. Always state which tools Proof360 uses itself.
5. First-person reasoning. The recommendation reads like a founder talking to a founder, not a review site.
6. Research-backed positioning. The quadrant axes and vendor placement come from independent research — not internal opinion.

---

## Where it appears in the product

Inside each gap card expanded state (Layer 2 only — post email gate):

1. Gap card header + why + score preview (Layer 1 visible)
2. [email gate]
3. Vendor intelligence component appears below the gap detail
4. Structure: quadrant -> our pick card -> all vendors grid -> disclosure line

---

## Quadrant design

### Axes per category

Each category has two axes relevant to the decision a founder at this stage actually faces.

GRC / compliance automation:
- X axis: Slower to audit-ready -> Faster to audit-ready
- Y axis: Cheaper -> More expensive

Security policy documentation:
- X axis: Manual / template-led -> Automated
- Y axis: Cheaper -> More comprehensive

Vendor risk management:
- X axis: Lightweight / spreadsheet -> Enterprise-grade
- Y axis: Self-serve -> Managed / supported

Identity / IAM:
- X axis: Developer-led -> IT / admin-led
- Y axis: Startup-focused -> Enterprise-focused

Incident response:
- X axis: Process-led (documentation) -> Tool-led (platform)
- Y axis: Reactive -> Proactive / continuous

### Quadrant data source

Do NOT hardcode vendor positions based on internal opinion.

Vendor quadrant positions must come from the vendor_categories data object in the API response. The API layer is responsible for maintaining and updating vendor positioning. The frontend renders whatever coordinates the API returns.

Quadrant dot format per vendor:
- x: float 0.0-1.0 (left to right on X axis)
- y: float 0.0-1.0 (top to bottom — so 0.0 = top of quadrant, 1.0 = bottom)
- is_partner: boolean
- is_pick: boolean (only one vendor per category can be true)
- display_name: string
- initials: string (1-2 chars for the dot label)

---

## API response shape for vendor intelligence

Each gap object in the report response includes a vendor_intelligence object:

```json
{
  "gap_id": "string",
  "vendor_intelligence": {
    "category_name": "GRC & compliance automation",
    "quadrant_axes": {
      "x_left": "Slower to audit-ready",
      "x_right": "Faster to audit-ready",
      "y_top": "More expensive",
      "y_bottom": "Cheaper"
    },
    "vendors": [
      {
        "vendor_id": "vanta",
        "display_name": "Vanta",
        "initials": "V",
        "x": 0.72,
        "y": 0.28,
        "is_partner": true,
        "is_pick": true,
        "deal_label": "20% off first year",
        "best_for": "Seed to Series B, AWS-native stacks",
        "summary": "Fastest to SOC 2. Connects to your existing stack in an afternoon.",
        "referral_url": "https://vanta.com/?ref=proof360"
      },
      {
        "vendor_id": "drata",
        "display_name": "Drata",
        "initials": "D",
        "x": 0.62,
        "y": 0.38,
        "is_partner": true,
        "is_pick": false,
        "deal_label": "15% off first year",
        "best_for": "Larger teams, complex environments",
        "summary": "More customisation, longer setup. Better for Series B and beyond.",
        "referral_url": "https://drata.com/?ref=proof360"
      },
      {
        "vendor_id": "secureframe",
        "display_name": "Secureframe",
        "initials": "S",
        "x": 0.55,
        "y": 0.52,
        "is_partner": false,
        "is_pick": false,
        "deal_label": null,
        "best_for": "Mid-market, broader framework coverage",
        "summary": "Good mid-market option. Strong for companies needing multiple frameworks.",
        "referral_url": null
      }
    ],
    "pick": {
      "vendor_id": "vanta",
      "stage_context": "Seed stage · AWS stack",
      "recommendation_headline": "Vanta",
      "recommendation_body": "We use Vanta ourselves — Proof360's own SOC 2 readiness runs on it. It connected to our AWS stack in an afternoon and had us audit-ready in 6 weeks. For a seed-stage company closing its first enterprise deal, it's the fastest path from gap to proof.",
      "meta": {
        "time_to_close": "2-3 weeks",
        "covers": "SOC 2, ISO 27001, HIPAA",
        "best_for": "AWS-native, seed to Series B",
        "what_wed_do_differently": "Start evidence collection earlier"
      },
      "cta_label": "Start with Vanta",
      "deal_label": "20% off first year through Proof360",
      "referral_url": "https://vanta.com/?ref=proof360"
    },
    "disclosure": "We use Vanta and Drata ourselves. Proof360 has a referral arrangement with these partners — we earn a small commission when you sign up through us, and you get a discount. We would recommend them either way."
  }
}
```

---

## Frontend rendering rules

### Quadrant

- Render all vendors as dots using x/y coordinates from the API
- Dot size: 28px circle
- Partner dots: green fill (#EAF3DE), green border (#3B6D11), green initials (#2B5210)
- Non-partner dots: secondary background, secondary border, muted initials
- Pick dot: same as partner but with a double ring (box-shadow: 0 0 0 3px #EAF3DE, 0 0 0 4.5px #3B6D11)
- Each dot shows: initials inside circle, vendor name below, "Proof360 deal" chip below name if is_partner
- Clicking any dot calls sendPrompt with vendor name and category context
- Quadrant axes labelled at corners: top-left, top-right, bottom-left, bottom-right (10px uppercase muted)

### Our pick card

- Green header band: "Our pick for your stage" badge (left) + stage_context (right)
- Vendor name in DM Serif Display
- recommendation_body as main copy — this is first-person, do not truncate
- 2x2 meta grid: time_to_close / covers / best_for / what_wed_do_differently
- CTA button: dark background, cta_label text, opens referral_url
- Deal label next to button in green text
- If referral_url is null for this vendor, CTA button is hidden

### All vendors grid

- 3-column grid
- Pick card: 2px green border
- Partner cards: 0.5px green border, green tinted background
- Non-partner cards: standard 0.5px border, no tint
- Each card: vendor name (bold), summary (muted, 11px), best_for (muted, 11px)
- Partner cards show deal chip: green pill with deal_label text
- Pick card shows "Our pick · Proof360 deal" combined label
- Clicking any card calls sendPrompt

### Disclosure line

- Always render at bottom of vendor intelligence component
- Plain 11px muted text
- Use disclosure string from API exactly as returned
- Include "How this works" link that calls sendPrompt('How does the Proof360 partner referral arrangement work?')
- Never hide, never abbreviate

---

## Partner data (current as of MVP)

This lives in the API, not the frontend. Listed here for reference only.

Partners with referral arrangements:
- Vanta (GRC): 20% off first year. Proof360 uses this internally.
- Drata (GRC): 15% off first year. Proof360 uses this internally.
- Cloudflare (Infrastructure / network security): existing partnership. Deal TBC.
- Cisco Duo (Identity / MFA): existing partnership. Deal TBC.
- AWS (Infrastructure): existing partnership. AWS Activate credits for eligible startups.

Non-partner vendors to include neutrally:
- Secureframe (GRC)
- Sprinto (GRC)
- Okta (Identity)
- PagerDuty (Incident response)
- SecurityScorecard (Vendor risk)
- Template-led / consulting-led options (always shown as alternatives in every category)

---

## Vendor research and positioning

Proof360 does not self-author vendor quadrant positions.

Positioning data must come from:
- Independent analyst research (Gartner, Forrester where available)
- Practitioner community data (G2, Capterra ratings and review themes)
- MSP and implementation partner feedback
- Public pricing and time-to-value benchmarks
- Proof360's own implementation experience where applicable

The research layer is maintained separately from the product. The API serves the current vendor data. The frontend renders whatever the API returns — no vendor positions are hardcoded in the frontend.

When new vendor data is available, update the API data layer only. The frontend requires no changes.

---

## What the frontend never does

- Never hardcode vendor names, positions, or deal details
- Never render a vendor not present in the API response
- Never show referral URLs without is_partner === true
- Never hide the disclosure line
- Never describe a non-partner vendor negatively to favour a partner
- Never show the vendor intelligence component in Layer 1 (pre email gate)
