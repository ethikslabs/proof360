# Evidence Map

This file explains where to look when a claim in the handoff needs proof.

## Product Direction

Evidence:

- [Founder Memory V1 Spec](../specs/2026-06-10-founder-memory-v1-spec.md)
- [Founder Memory V1 Plan](../plans/2026-06-10-founder-memory-v1.md)
- [Landing Emotional Contract](../design/landing-emotional-contract.md)

Key claim:

Proof360 is moving toward private founder memory, not a form or CRM.

## Rendering And Trust

Evidence:

- [Contextual Guidance Rendering](../specs/2026-05-27-contextual-guidance-rendering.md)
- [Surface Authority Architecture](../specs/2026-05-27-surface-authority-architecture.md)

Key claim:

Frontend renders state; backend computes truth. Observations appear before recommendations.

## Commercial Pathways

Evidence:

- [Partner Register](../partner-register.md)
- [AWS Motion Inventory](../aws-motion-inventory.md)
- [AWS Funding Program Mapping](../aws-funding-program-mapping.md)
- [Vanta Partner Portal Field Intel](../vanta-partner-portal-field-intel-2026-05.md)
- [Ingram Micro Field Intel](../ingram-micro-xvantage-field-intel-2026-05.md)
- [Dicker Data Field Intel](../dicker-data-partner-portal-field-intel-2026-05.md)

Key claim:

Trust gaps can route into vendor, program, insurance, or advisory pathways.

## Implementation Evidence

Evidence:

- `api/src/services/memory-store-file.js`
- `api/src/services/memory-derive.js`
- `api/src/services/profile-projections.js`
- `api/src/handlers/profile.js`
- `api/src/handlers/session-attach.js`
- `frontend/src/pages/Chat.jsx`

Key claim:

Founder memory V1 is file-backed, append-only, Auth0-protected, and projection-driven.

## Verification Evidence

Evidence:

- `api/tests/unit/memory-store-file.test.js`
- `api/tests/unit/memory-derive.test.js`
- `api/tests/unit/profile-projections.test.js`
- `api/tests/unit/profile-handlers.test.js`

Recent local verification:

- API test suite passed.
- Frontend production build passed.
- Changed-file whitespace check passed.

## Missing Evidence

- Live authenticated founder-memory test after deployment.
- Auth0 API audience confirmation.
- SSM parameter confirmation for Auth0 domain and audience.
- Production memory directory write confirmation.
