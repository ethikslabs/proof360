// Feature: overnight-v1, Property 5: Preread memory guard preserves non-preread sessions
// **Validates: Requirements 4.12, 4.13**

import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { enforcePrereadMemoryGuard } from '../../src/handlers/admin-preread.js';
import { createSession, _getSessionsMap } from '../../src/services/session-store.js';

/**
 * Arbitrary that generates a list of session descriptors with varying sources.
 * Each descriptor has a source and a unique index used to build a distinguishable URL.
 */
const sourceArb = fc.constantFrom('user', 'share_link', 'preread');

const sessionListArb = fc.array(
  fc.record({
    source: sourceArb,
    // Small offset to give each session a distinct created_at timestamp
    createdAtOffset: fc.integer({ min: 0, max: 100_000 }),
  }),
  { minLength: 0, maxLength: 250 },
);

/** Wipe all sessions between test runs */
function clearSessions() {
  const map = _getSessionsMap();
  map.clear();
}

describe('Property 5: Preread memory guard preserves non-preread sessions', () => {
  afterEach(() => clearSessions());

  it('non-preread sessions are never removed and preread count stays <= 100', () => {
    fc.assert(
      fc.property(sessionListArb, (descriptors) => {
        clearSessions();

        // Populate the session store
        const nonPrereadIds = new Set();
        for (let i = 0; i < descriptors.length; i++) {
          const { source, createdAtOffset } = descriptors[i];
          const session = createSession({
            website_url: `https://example-${i}.com`,
            source,
          });
          // Adjust created_at so oldest-first ordering is deterministic
          session.created_at = Date.now() - (descriptors.length - i) * 1000 - createdAtOffset;

          if (source !== 'preread') {
            nonPrereadIds.add(session.id);
          }
        }

        // Run the memory guard
        enforcePrereadMemoryGuard();

        const sessions = _getSessionsMap();

        // 1. Every non-preread session must still exist
        for (const id of nonPrereadIds) {
          assert.ok(
            sessions.has(id),
            `Non-preread session ${id} was removed by the memory guard`,
          );
        }

        // 2. Preread session count must be <= 100
        let prereadCount = 0;
        for (const [, session] of sessions) {
          if (session.source === 'preread') prereadCount++;
        }
        assert.ok(
          prereadCount <= 100,
          `Preread session count is ${prereadCount}, expected <= 100`,
        );

        // 3. Total non-preread sessions must be unchanged
        let nonPrereadCount = 0;
        for (const [, session] of sessions) {
          if (session.source !== 'preread') nonPrereadCount++;
        }
        assert.equal(
          nonPrereadCount,
          nonPrereadIds.size,
          `Non-preread count changed: expected ${nonPrereadIds.size}, got ${nonPrereadCount}`,
        );
      }),
      { numRuns: 200 },
    );
  });
});
