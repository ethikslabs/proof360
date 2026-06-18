# Current State

Last oriented: 2026-06-10.

## Product State

Proof360 is live as the founder entry surface. It supports cold-read assessment, chat, trust-gap rendering, vendor/program surfaces, and a founder-facing Company Profile direction.

The active design direction is the private founder memory kernel:

```text
events -> evidence -> observations -> claims -> projections
```

The visible Company Profile is not a manually edited record. It is the first projection reconstructed from private founder memory.

## Implementation State

The current working tree includes JSON-first Founder Memory V1 implementation work:

- File-backed memory store under `MEMORY_STORE_DIR`.
- Auth0-verified private profile routes.
- Append-only transaction files.
- Deterministic projections for lit tiles.
- Frontend token handling, session attach, and projection-derived tile state.

Verification completed locally:

- API test suite passed.
- Frontend production build passed.
- Changed-file whitespace check passed.

## Deployment State

The implementation is ready for code review and deployment once Auth0 and environment settings are confirmed.

Required runtime environment:

- `AUTH0_DOMAIN`
- `AUTH0_AUDIENCE`
- `MEMORY_STORE_DIR`

Production default for memory:

```text
/home/ec2-user/.ethikslabs/proof360/memory
```

Local default:

```text
~/.ethikslabs/proof360/memory
```

## Open Items

- Confirm Auth0 API audience exists.
- Confirm `/proof360/AUTH0_DOMAIN` and `/proof360/AUTH0_AUDIENCE` SSM params exist. SSM means AWS Systems Manager Parameter Store, the AWS service used here to inject runtime configuration.
- Run live authenticated login test after deploy.
- Decide when the handoff should become generated from the memory kernel rather than hand-maintained.

## Current Boundary

Proof360 memory is private. Ethiks360 sharing is intentionally absent from V1.
