// proof360 memory store — facade / single switch point for the v1(file) → v2(atom) cutover.
//
// STEP 1 of PROOF360-MEMORY-V2-CUTOVER-001 (see
// working/2026-07-05-proof360-memory-v2-cutover-plan.md): this is a pure pass-through to the
// file-backed store. Behaviour is byte-identical to importing memory-store-file.js directly —
// the handlers (profile.js, session-attach.js, cer.js) now import from here instead, so the
// import site is centralised.
//
// STEP 2 adds the selector: a MEMORY_STORE=file|atom flag (default `file`) that routes reads
// through the v2 atom adapter (over api/src/memory/project.js). Until then, nothing changes.
export * from './memory-store-file.js';
