// proof360 memory store — facade / single switch point for the v1(file) → v2(atom) cutover.
//
// PROOF360-MEMORY-V2-CUTOVER-001 (plan: workspace-control
// working/2026-07-05-proof360-memory-v2-cutover-plan.md).
//
//   step 1  — centralise the handlers' store import here (done).
//   step 2a — this file: MEMORY_STORE=file|atom flag, default `file`.
//   step 2b — the real atom adapter over api/src/memory/project.js. NOT built yet.
//
// SAFETY: atom mode is FAIL-CLOSED. v1 (file) reconstructs one founder's own profile from
// their event log; v2 (project) is a permission-filtered graph read. Mapping one onto the other
// is no-leak-critical and can only be verified against a real founder migrated into the atom
// store (estate rule: prove on one real record before bulk). Until that adapter is built and
// verified, `MEMORY_STORE=atom` throws rather than risk returning wrong or unfiltered data.
// Default and only working path today is `file` — zero live change.

import * as fileStore from './memory-store-file.js';

const MODE = process.env.MEMORY_STORE || 'file';

function failClosed(fnName) {
  return () => {
    throw new Error(
      `memory-store: MEMORY_STORE=atom is not yet implemented (${fnName}). ` +
      `The atom adapter (cutover plan step 2b) must be built and verified on a real ` +
      `record first. Set MEMORY_STORE=file.`,
    );
  };
}

// The read/write surface the handlers (profile, session-attach, cer) depend on.
const SWITCHABLE = [
  'getOrCreateFounder',
  'getOrCreateActiveProfile',
  'appendTransaction',
  'replayProfile',
  'writeSnapshot',
  'claimSessionForProfile',
  'storeStats',
];

const atomStore = Object.fromEntries(SWITCHABLE.map((fn) => [fn, failClosed(fn)]));
const active = MODE === 'atom' ? atomStore : fileStore;

export const getOrCreateFounder = active.getOrCreateFounder;
export const getOrCreateActiveProfile = active.getOrCreateActiveProfile;
export const appendTransaction = active.appendTransaction;
export const replayProfile = active.replayProfile;
export const writeSnapshot = active.writeSnapshot;
export const claimSessionForProfile = active.claimSessionForProfile;
export const storeStats = active.storeStats;

// Not part of the swappable read model — file-backed utilities. Always pass through.
export const memoryStoreRoot = fileStore.memoryStoreRoot;
export const _internals = fileStore._internals;
