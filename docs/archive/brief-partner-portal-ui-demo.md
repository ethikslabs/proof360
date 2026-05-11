# Proof360 — Partner Portal UI Demo Brief

## Purpose

This brief is for **frontend UX work only**.

The goal is to let Claude Code build and iterate the partner portal experience **without touching real auth, tenant resolution, backend enforcement, or production domain logic**.

This is a **demo-mode UI surface** so John can review the experience quickly.

---

## Scope

In scope:
- Login page UX only
- Demo tenant/domain selection
- Mocked partner context in frontend state
- Routing into the existing portal experience
- Clear demo indicators in the UI

Out of scope:
- Auth0
- Okta
- real JWT validation
- backend tenant resolution
- production domain mapping
- API auth hardening
- any partner-to-founder messaging
- any CRM logic

---

## Core Rule

This is a **UI simulation layer only**.

It must not be mistaken for production auth.

The experience should feel real, but the implementation should remain explicitly mock/demo.

---

## UX Goal

Allow John to:
1. land on a partner login page
2. choose a known partner domain from a list
3. enter the portal immediately under mocked tenant context
4. review the UI experience for each partner view

No real login is required for this round.

---

## Demo Login Model

Replace the current real login experience temporarily with a **domain selector UI**.

### Behaviour

User lands on login page.

They choose one of the available partner domains.

The frontend sets a mocked tenant context and routes into the portal.

No auth provider calls should occur.

---

## Demo Domains

Use a hardcoded selectable list for now:

- `vanta.com`
- `cisco.com`
- `cloudflare.com`
- `ingrammicro.com`
- `paloaltonetworks.com`
- `crowdstrike.com`

This list is only for UX validation and can be extended later.

---

## Mock Tenant Mapping

The frontend should map each domain to a mocked tenant object.

Example shape:

```text
{
  domain: "vanta.com",
  tenantKey: "vanta",
  tenantName: "Vanta",
  mode: "demo"
}
```

Suggested mappings:

- `vanta.com` → `Vanta`
- `cisco.com` → `Cisco`
- `cloudflare.com` → `Cloudflare`
- `ingrammicro.com` → `Ingram Micro`
- `paloaltonetworks.com` → `Palo Alto Networks`
- `crowdstrike.com` → `CrowdStrike`

This mapping lives in the frontend for now.

---

## State Handling

Store the selected tenant in frontend state.

Optional:
- persist in `localStorage` for refresh continuity during demo review

But keep it simple.

No backend dependency is needed for this round.

---

## Routing Rule

If a demo tenant has been selected:
- allow access to the partner portal route

If no tenant has been selected:
- keep user on the demo login page

---

## Visual Requirements

The UI must make it obvious that this is demo mode.

### On login page
Show clear copy such as:
- **Select your organisation**
- **Demo mode — partner access simulation**

### In portal header
Show an active tenant indicator such as:
- **Logged in as: Vanta (Demo)**
- **Logged in as: Cisco (Demo)**

This prevents confusion during review.

---

## Interaction Design

The login experience should feel clean and intentional.

Preferred direction:
- branded login-style card or panel
- selectable domain list as buttons, tiles, or a dropdown
- quick transition into portal after selection

This should feel like a believable partner entry surface, not a developer test page.

---

## Hard Constraints

Do not:
- call Auth0
- call Okta
- call any real login provider
- introduce JWT handling
- wire backend auth
- mix demo logic with production auth logic in an irreversible way

This should be easy to remove or disable later.

---

## Implementation Preference

Wrap this demo experience behind a clear flag or isolated code path so it can be swapped out cleanly later.

Examples:
- demo mode flag
- separate demo login component
- isolated mock tenant state provider

The exact implementation is up to Claude Code.

---

## Product Constraint

This is **not** a rethink of the product.

It is only a way to review:
- partner entry UX
- mocked tenant switching
- portal presentation by partner context

Do not expand scope.

---

## Summary

For this round, build:

- a demo partner login page
- a hardcoded domain selector
- mocked tenant context
- immediate entry into the portal
- a visible demo tenant badge/header

And do it with:
- zero real auth
- zero backend dependency
- zero production logic assumptions

---

## Final Reduction

**Fake login. Real UX review.**
