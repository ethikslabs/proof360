# Implementation Queue

This queue is the handoff view, not the project tracker.

## Immediate

- Review and commit JSON-first Founder Memory V1 changes.
- Confirm Auth0 API audience and SSM parameters. SSM means AWS Systems Manager Parameter Store, the AWS service used here to inject runtime configuration.
- Deploy to proof360.au.
- Run authenticated founder login test.
- Confirm memory files write under `MEMORY_STORE_DIR`, outside the repo.

## Next

- Add a small operator script to inspect a founder memory profile safely.
- Add a rebuild command for `snapshots/current.json`.
- Add projection contract examples to the spec.
- Add a read-only handoff renderer that can produce this folder from current repo state.

## Later

- Add document/upload evidence sources.
- Add CORPUS reference evidence with `source: "corpus"`.
- Add AWS/Microsoft/HubSpot feeds as source metadata, not schema migrations.
- Add Ethiks360 export only after founder-approved sharing is designed.
- Consider Postgres adapter only when file storage pressure is real.

## Not Now

- Do not build a customer relationship management (CRM) system.
- Do not add external sharing.
- Do not add tone or hesitation observations.
- Do not make projections canonical facts.
- Do not create a founder-memory Postgres migration for V1.

## Review Checklist

- Does every memory write carry `source`?
- Does every durable write fail loud on failure?
- Can the profile be rebuilt from transactions?
- Are unknowns still unknown?
- Are founder claims protected from system overwrite?
- Is cold read still usable without login?
