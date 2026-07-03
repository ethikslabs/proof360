import { describe, it, expect } from 'vitest';
import { runReconPipeline } from '../../src/services/recon-pipeline.js';

// These targets are literal blocked IPs / hostnames, so the guard short-circuits
// BEFORE any network source runs — the test needs no mocking and no sockets.
describe('runReconPipeline SSRF short-circuit', () => {
  for (const target of [
    'http://169.254.169.254',       // cloud metadata
    'http://127.0.0.1',             // loopback
    'http://10.0.0.5:6379',         // private Redis
    'localhost',                    // bare loopback hostname
    '192.168.1.1',                  // private, no scheme
  ]) {
    it(`blocks ${target} and skips every source`, async () => {
      const t0 = Date.now();
      const result = await runReconPipeline(target, 'AttackerCo');
      // Instant return — no 2.5s port-probe timeouts ran.
      expect(Date.now() - t0).toBeLessThan(1000);
      expect(result.blocked).toBe(true);
      expect(result.blocked_reason).toBe('target_not_public');
      for (const src of ['dns', 'http', 'certs', 'ip', 'github', 'jobs', 'hibp', 'ports', 'ssllabs', 'abuseipdb']) {
        expect(result[src], src).toMatchObject({ skipped: true, reason: 'target_not_public' });
      }
      // No open_ports leaked back to the caller.
      expect(result.ports.open_ports).toBeUndefined();
    });
  }

  it('reports the blocked target via onSourceComplete without probing', async () => {
    const events = [];
    await runReconPipeline('http://169.254.169.254', 'X', {
      onSourceComplete: (src, line) => events.push([src, line]),
    });
    expect(events.some(([src]) => src === 'blocked')).toBe(true);
    expect(events.some(([src]) => src === 'ports')).toBe(false);
  });
});
