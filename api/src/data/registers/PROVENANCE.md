# Register projections — provenance

These two files are **verbatim projection snapshots**, not authority.

| File | Canonical source (one writer) | Generator |
|------|-------------------------------|-----------|
| `models.register.json` | `Projects/CONTROL/models.register.derived.json` | `CONTROL/scripts/derive-model-register.mjs` |
| `data.register.json` | `Projects/CONTROL/data.register.derived.json` | `CONTROL/scripts/derive-data-register.py` |

Rules (workspace projection doctrine):

- Authority stays with the canonical workspace files. If a projection conflicts
  with canonical, canonical wins.
- **Never hand-edit these files** (`_meta.hand_edits_forbidden` travels with them).
- Re-copy after any re-derive. The `_meta.generated_at` stamp is surfaced to the
  customer as the register's derivation date (advisory law 2 — provenance chips),
  so staleness is visible by design, never hidden.
- The register is a **register, NOT a router** (John ruling): proof360 reads it to
  advise; it never routes estate inference through it.

Advisory laws these files serve (John "Guide" ruling 2026-07-15):
1. Advisory speaks only inside the conversation.
2. An honest zero renders as a confident answer with provenance, never an apology.
3. Free sorts first — `commercial: free|paid` is register data, never persuasion.
4. The paid lane renders below the free answer, in the customer's own AWS billing
   frame, margin disclosed at quote.
