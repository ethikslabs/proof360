// Feature: overnight-v1, Property 1: Shareable URL round-trip
// **Validates: Requirements 2.2**

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { buildShareableUrl, parseShareableUrl } from '../../src/utils/shareable-url.js';

// Generator: UUID-like session IDs
const sessionIdArb = fc.uuid();

// Generator: valid http/https URLs with realistic structure
const urlArb = fc.oneof(
  fc.webUrl({ validSchemes: ['https'] }),
  fc.webUrl({ validSchemes: ['http'] }),
);

describe('Property 1: Shareable URL round-trip', () => {
  it('for any valid session ID and URL, constructing then parsing a shareable URL recovers both exactly', () => {
    fc.assert(
      fc.property(sessionIdArb, urlArb, (sessionId, originalUrl) => {
        const shareable = buildShareableUrl(sessionId, originalUrl);
        const parsed = parseShareableUrl(shareable);

        assert.equal(parsed.session, sessionId,
          `session round-trip failed: expected ${JSON.stringify(sessionId)}, got ${JSON.stringify(parsed.session)}`);
        assert.equal(parsed.url, originalUrl,
          `url round-trip failed: expected ${JSON.stringify(originalUrl)}, got ${JSON.stringify(parsed.url)}`);
      }),
      { numRuns: 200 },
    );
  });

  it('shareable URL always starts with the expected path prefix', () => {
    fc.assert(
      fc.property(sessionIdArb, urlArb, (sessionId, originalUrl) => {
        const shareable = buildShareableUrl(sessionId, originalUrl);

        assert.ok(shareable.startsWith('/audit/cold-read?session='),
          `shareable URL should start with /audit/cold-read?session=, got: ${shareable}`);
      }),
      { numRuns: 200 },
    );
  });

  it('shareable URL contains both session and url query parameters', () => {
    fc.assert(
      fc.property(sessionIdArb, urlArb, (sessionId, originalUrl) => {
        const shareable = buildShareableUrl(sessionId, originalUrl);
        const parsed = new URL(shareable, 'https://placeholder.local');

        assert.ok(parsed.searchParams.has('session'),
          'shareable URL must have a session parameter');
        assert.ok(parsed.searchParams.has('url'),
          'shareable URL must have a url parameter');
      }),
      { numRuns: 200 },
    );
  });
});
