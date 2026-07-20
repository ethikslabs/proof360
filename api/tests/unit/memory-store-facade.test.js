import { describe, it, expect, vi, afterEach } from 'vitest';

// PROOF360-MEMORY-V2-CUTOVER-001 step 2a — the store facade + MEMORY_STORE flag.
// Proves: default routes to the real file store (zero behaviour change), and atom mode
// is fail-closed (throws rather than silently returning wrong/unfiltered data).

describe('memory-store facade', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('defaults to the file store — same function references, zero behaviour change', async () => {
    vi.resetModules();
    const facade = await import('../../src/services/memory-store.js');
    const fileStore = await import('../../src/services/memory-store-file.js');
    expect(facade.replayProfile).toBe(fileStore.replayProfile);
    expect(facade.getOrCreateFounder).toBe(fileStore.getOrCreateFounder);
    expect(facade.getOrCreateActiveProfile).toBe(fileStore.getOrCreateActiveProfile);
    expect(facade.appendTransaction).toBe(fileStore.appendTransaction);
    expect(facade.claimSessionForProfile).toBe(fileStore.claimSessionForProfile);
  });

  it('MEMORY_STORE=atom is fail-closed — every switchable read/write throws', async () => {
    vi.resetModules();
    vi.stubEnv('MEMORY_STORE', 'atom');
    const facade = await import('../../src/services/memory-store.js');
    expect(() => facade.replayProfile('profile-1')).toThrow(/atom.*not yet implemented/i);
    expect(() => facade.getOrCreateFounder({ sub: 'x' })).toThrow(/MEMORY_STORE=file/);
    expect(() => facade.appendTransaction('p', [])).toThrow(/step 2b/i);
  });
});
