import { describe, it, expect } from 'vitest';
import { reconDns } from '../../src/services/recon-dns.js';
import { formatReconLine } from '../../src/services/recon-pipeline.js';

// A DNS *infrastructure* failure (SERVFAIL / timeout / refused) must not be reported
// as a genuinely-absent record. The finder's P1: a resolver hiccup rendered DMARC/SPF
// as 'missing', firing false critical/high gaps and corrupting trust_score. Genuine
// absence (NXDOMAIN / no-data) stays 'missing' — that IS a real gap.

function dnsError(code) {
  const e = new Error(code);
  e.code = code;
  return e;
}

// Build an injectable resolver. `plan` maps a lookup kind to either a value or an error.
function resolver(plan) {
  const give = (key) => {
    const v = plan[key];
    if (v instanceof Error) throw v; // sync throw → rejected promise from the async fn
    return v ?? [];
  };
  return {
    resolveTxt: async (host) => give(host.startsWith('_dmarc') ? 'dmarc' : 'root'),
    resolveMx: async () => give('mx'),
    resolveCaa: async () => give('caa'),
  };
}

const REAL_DMARC = [['v=DMARC1; p=reject']];
const REAL_SPF = [['v=spf1 include:_spf.google.com -all']];

describe('reconDns honesty — lookup failure ≠ missing record', () => {
  it('renders DMARC as "unknown" when the _dmarc lookup fails on infrastructure error', async () => {
    const r = await reconDns('https://acme.test', 's1', {
      resolver: resolver({ dmarc: dnsError('ESERVFAIL'), root: REAL_SPF }),
    });
    expect(r.dmarc_policy).toBe('unknown');
  });

  it('keeps DMARC as "missing" when the record is genuinely absent (ENOTFOUND/ENODATA)', async () => {
    for (const code of ['ENOTFOUND', 'ENODATA']) {
      const r = await reconDns('https://acme.test', 's1', {
        resolver: resolver({ dmarc: dnsError(code), root: REAL_SPF }),
      });
      expect(r.dmarc_policy, code).toBe('missing');
    }
  });

  it('parses a present DMARC record normally', async () => {
    const r = await reconDns('https://acme.test', 's1', {
      resolver: resolver({ dmarc: REAL_DMARC, root: REAL_SPF }),
    });
    expect(r.dmarc_policy).toBe('reject');
  });

  it('renders SPF as "unknown" on root-TXT infrastructure failure, "missing" on genuine absence', async () => {
    const fail = await reconDns('https://acme.test', 's1', {
      resolver: resolver({ dmarc: REAL_DMARC, root: dnsError('ETIMEOUT') }),
    });
    expect(fail.spf_policy).toBe('unknown');

    const absent = await reconDns('https://acme.test', 's1', {
      resolver: resolver({ dmarc: REAL_DMARC, root: dnsError('ENOTFOUND') }),
    });
    expect(absent.spf_policy).toBe('missing');
  });

  it('reports has_caa as null (unknown) when the CAA lookup fails, false when genuinely absent', async () => {
    const fail = await reconDns('https://acme.test', 's1', {
      resolver: resolver({ dmarc: REAL_DMARC, root: REAL_SPF, caa: dnsError('ESERVFAIL') }),
    });
    expect(fail.has_caa).toBeNull();

    const absent = await reconDns('https://acme.test', 's1', {
      resolver: resolver({ dmarc: REAL_DMARC, root: REAL_SPF, caa: [] }),
    });
    expect(absent.has_caa).toBe(false);
  });

  it('marks the whole result dns_resolved:false when a core lookup failed on infrastructure', async () => {
    const r = await reconDns('https://acme.test', 's1', {
      resolver: resolver({ dmarc: dnsError('ESERVFAIL'), root: REAL_SPF }),
    });
    expect(r.dns_resolved).toBe(false);
  });

  it('does NOT render an undetermined DMARC as green "enforced" (Codex P2)', () => {
    const line = formatReconLine('dns', { dmarc_policy: 'unknown', spf_policy: 'unknown', dns_resolved: false });
    expect(line.color).toBe('muted');
    expect(line.text).not.toMatch(/enforced/i);
    expect(line.text).toMatch(/undetermined/i);
  });

  it('still renders a real enforced DMARC as green', () => {
    const line = formatReconLine('dns', { dmarc_policy: 'reject', spf_policy: 'strict', dns_resolved: true });
    expect(line.color).toBe('ok');
    expect(line.text).toMatch(/enforced/i);
  });

  it('still flags a genuinely-missing DMARC as an error', () => {
    const line = formatReconLine('dns', { dmarc_policy: 'missing', dns_resolved: true });
    expect(line.color).toBe('err');
  });
});
