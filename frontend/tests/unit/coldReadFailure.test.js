// Pins the cold-read failure message. Born 2026-08-26: the pipeline's catch was
// `} catch {`, so all three distinct failures — session start, inference timeout,
// analysis — rendered one dead end that blamed the URL:
//
//     "Couldn't read cognisys.co.uk. Check the URL or try a different one."
//
// John hit it in a fresh tab and again in incognito while the API answered 200
// through the public edge every time, and asked: "if you can't explain it or fix
// it, who can?" Nobody could — the error object was discarded at the point of
// failure, so no console line, no operator, and no future session had anything
// to work from.
import { describe, it, expect } from 'vitest';
import { coldReadFailure } from '../../src/rendering/coldReadFailure.js';

const D = 'cognisys.co.uk';

describe('coldReadFailure — names what happened', () => {
  it('distinguishes the three pipeline failures from each other', () => {
    const start = coldReadFailure(D, new Error('start failed'));
    const timeout = coldReadFailure(D, new Error('inference timeout'));
    const analysis = coldReadFailure(D, new Error('analysis failed'));

    expect(new Set([start, timeout, analysis]).size).toBe(3);
    expect(start).toMatch(/couldn't open a session/i);
    expect(timeout).toMatch(/didn't finish in time/i);
    expect(analysis).toMatch(/read didn't come back/i);
  });

  it('stops blaming the URL for a failure on our side', () => {
    for (const m of ['start failed', 'inference timeout', 'analysis failed']) {
      const line = coldReadFailure(D, new Error(m));
      expect(line).toMatch(/that's on us, not the url/i);
      // The old message's advice — "Check the URL" — was actively misleading here.
      expect(line).not.toMatch(/check the url or try a different one/i);
    }
  });

  // The restart case, which is the one that actually bit (2026-08-26): the server
  // said 'failed', the client called it a timeout, and nobody could tell them apart.
  it('reports a server-side scan failure distinctly from a client-side timeout', () => {
    const scanFailed = coldReadFailure(D, new Error('scan failed'));
    const timedOut = coldReadFailure(D, new Error('inference timeout'));
    expect(scanFailed).not.toBe(timedOut);
    expect(scanFailed).toMatch(/restarting under it/i);
    expect(scanFailed).toMatch(/that's on us, not the url/i);
  });

  it('always names the domain that was being read', () => {
    expect(coldReadFailure(D, new Error('inference timeout'))).toContain(D);
    expect(coldReadFailure(D, new Error('something unmapped'))).toContain(D);
  });

  it('reports how long it ran, so a 150s timeout is distinguishable from an instant fail', () => {
    expect(coldReadFailure(D, new Error('inference timeout'), 150_000)).toMatch(/after 150s/);
    expect(coldReadFailure(D, new Error('start failed'), 400)).toMatch(/after 0s|start/i);
  });

  it('omits the elapsed clause when the duration is unknown or nonsense', () => {
    expect(coldReadFailure(D, new Error('start failed'))).not.toMatch(/after \d+s/);
    expect(coldReadFailure(D, new Error('start failed'), 0)).not.toMatch(/after \d+s/);
    expect(coldReadFailure(D, new Error('start failed'), NaN)).not.toMatch(/after \d+s/);
  });

  it('an unrecognised failure still names itself rather than hiding', () => {
    const line = coldReadFailure(D, new Error('NetworkError when attempting to fetch resource'));
    expect(line).toContain('NetworkError');
  });

  it('never throws on a malformed error — a broken catch must not break the catch', () => {
    expect(() => coldReadFailure(D, null)).not.toThrow();
    expect(() => coldReadFailure(D, undefined)).not.toThrow();
    expect(() => coldReadFailure(D, 'a bare string')).not.toThrow();
    expect(coldReadFailure(D, 'a bare string')).toContain('a bare string');
  });
});
