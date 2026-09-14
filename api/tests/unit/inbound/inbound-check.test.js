// BRIEF — Inbound Trust Check ("Check this"), 14 Sept 2026. Tea: one input (an .eml),
// three lines out, evidence below the fold, every row labelled [PUBLIC]/[VENDOR]/[DERIVED],
// no score, no verdict word, no "you should". Lookups are injected here so the tests read
// the code, not the network; the CLI wires the real DNS, RDAP and research clients.
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseEml } from '../../../src/services/inbound-check/parse-eml.js';
import { templateSignature } from '../../../src/services/inbound-check/template.js';
import { runInboundCheck, renderCheck } from '../../../src/services/inbound-check/index.js';

const fx = (name) => readFileSync(join(process.cwd(), 'tests/fixtures/inbound', name), 'utf8');

// A resolver that knows three worlds: the throwaway .co domains (A record, no MX, no TXT),
// vanta.com (everything present), gmail.com (present).
const resolver = {
  resolve4: async (d) => (['theadambarvcaps.co', 'thejonathanjmvc.co', 'vanta.com', 'gmail.com'].includes(d) ? ['203.0.113.5'] : (() => { const e = new Error('nx'); e.code = 'ENOTFOUND'; throw e; })()),
  resolveMx: async (d) => (['vanta.com', 'gmail.com', 'thejonathanjmvc.co'].includes(d) ? [{ exchange: 'smtp.google.com', priority: 1 }] : []),
  resolveTxt: async (h) => {
    if (h === 'vanta.com' || h === 'gmail.com' || h === 'thejonathanjmvc.co') return [['v=spf1 include:_spf.google.com ~all']];
    if (h === '_dmarc.vanta.com' || h === '_dmarc.gmail.com' || h === '_dmarc.thejonathanjmvc.co') return [['v=DMARC1; p=reject']];
    return [];
  },
};
const rdap = async (d) => (d === 'vanta.com' ? { events: [{ eventAction: 'registration', eventDate: '2002-09-09T13:16:16Z' }], entities: [{ roles: ['registrar'], vcardArray: ['vcard', [['fn', {}, 'text', 'MarkMonitor Inc.']]] }] } : null);
// Web footprint: only vanta and gmail have any indexed presence.
const search = async (q) => {
  if (/vanta\.com|gmail\.com|sequoiacap\.com/.test(q)) return { ok: true, found: true, urls: ['https://www.vanta.com/'], summary: 'Vanta is a trust management platform.' };
  if (/Bill Campbell/.test(q)) return { ok: true, found: false, urls: [], summary: null };
  if (/Herzog/.test(q)) return { ok: true, found: true, urls: ['https://example-herzog.com/about'], value: '293B', summary: 'Site says 293B exit to community.' };
  return { ok: true, found: false, urls: [], summary: null };
};
const extract = async (text) => {
  if (/Herzog/.test(text)) return {
    entities: [{ name: 'Mr. Herzog', kind: 'person' }, { name: 'Bill Campbell', kind: 'person' }],
    claims: [
      { subject: 'Mr. Herzog', claim: '373B+ exit to community', value: '373B' },
      { subject: 'Mr. Herzog', claim: 'Trained by Bill Campbell', value: null },
    ],
  };
  return { entities: [], claims: [] };
};

let memoryDir;
beforeEach(() => { memoryDir = mkdtempSync(join(tmpdir(), 'inbound-')); });
const deps = () => ({ resolver, rdap, search, extract, memoryDir, now: () => new Date('2026-09-14T01:00:00Z') });

describe('parseEml — the headers and the text body, nothing fetched', () => {
  it('reads From, display name, Return-Path, DKIM domain, the ESP fingerprint and body links', () => {
    const m = parseEml(fx('trigger-1-theadambarvcaps.eml'));
    expect(m.from).toEqual({ name: 'Jon Rosen', address: 'jon@theadambarvcaps.co', domain: 'theadambarvcaps.co', local: 'jon' });
    expect(m.returnPathDomain).toBe('theadambarvcaps.co');
    expect(m.dkimDomains).toContain('theadambarvcaps.co');
    expect(m.esp).toBe('Instantly');
    expect(m.text).toContain('A few spots opened up for the September venture event');
    expect(m.text).not.toContain('=\r\n'); // quoted-printable decoded
    expect(m.receivedHosts.some((h) => /amazonaws\.com/.test(h))).toBe(true);
  });
  it('reads Reply-To and domains named in the body', () => {
    const m = parseEml(fx('mismatch-sequoia.eml'));
    expect(m.replyToDomain).toBe('sequoia-capital-partners.co');
    expect(m.bodyDomains).toContain('sequoiacap.com');
  });
});

describe('templateSignature — the shape a generator leaves behind', () => {
  it('both trigger domains share one signature', () => {
    expect(templateSignature('jon', 'theadambarvcaps.co')).toBe(templateSignature('jon', 'thejonathanjmvc.co'));
    expect(templateSignature('jon', 'theadambarvcaps.co')).toBe('jon@the*vc*.co');
  });
  it('a plain firm domain is not shaped', () => {
    expect(templateSignature('partners', 'vanta.com')).toBe('partners@vanta.com');
  });
});

describe('runInboundCheck — three lines, evidence below', () => {
  it('throwaway sender: no footprint is a finding, not an error', async () => {
    const r = await runInboundCheck(fx('trigger-1-theadambarvcaps.eml'), deps());
    expect(r.lines).toHaveLength(3);
    expect(r.lines[1]).toMatch(/couldn't find a trace of the company or the name/i);
    expect(r.lines[1]).toMatch(/couldn't find out when the domain was registered/i); // .co: no registry service answered
    expect(r.lines[1]).toMatch(/built to a pattern \(jon@the\*vc\*\.co\); no other sender/i);
    expect(r.lines[0]).toMatch(/Jon Rosen/);
    expect(r.lines[0]).toMatch(/theadambarvcaps\.co/);
    const esp = r.evidence.find((e) => e.check === 'sending platform');
    expect(esp.label).toBe('[DERIVED]');
    expect(esp.value).toMatch(/Instantly/);
    for (const e of r.evidence) expect(['[PUBLIC]', '[VENDOR]', '[DERIVED]']).toContain(e.label);
    expect(r.memory.prior_matches).toBe(0);
  });

  it('second sender from the same template: 1 prior sender matched, with the date', async () => {
    const d = deps();
    await runInboundCheck(fx('trigger-1-theadambarvcaps.eml'), d);
    const r = await runInboundCheck(fx('trigger-2-thejonathanjmvc.eml'), d);
    expect(r.memory.prior_matches).toBe(1);
    expect(r.memory.prior).toEqual([{ address: 'jon@theadambarvcaps.co', checked_at: '2026-09-14T01:00:00.000Z' }]);
    const row = r.evidence.find((e) => e.check === 'earlier senders with this pattern');
    expect(row.label).toBe('[DERIVED]');
    expect(row.value).toMatch(/^1: jon@theadambarvcaps\.co \(2026-09-14\)/);
    expect(r.lines[1]).toMatch(/one other sender with the same pattern has been through here before \(jon@theadambarvcaps\.co, 2026-09-14\)/);
  });

  it('conflicting numeric claim: the two values are shown side by side, no verdict', async () => {
    const r = await runInboundCheck(fx('trigger-2-thejonathanjmvc.eml'), deps());
    expect(r.lines[2]).toMatch(/doesn't match the record \(the email says 373B, Mr\. Herzog's own page says 293B\)/);
    const row = r.evidence.find((e) => e.check === 'claim: 373B+ exit to community');
    expect(row.label).toBe('[VENDOR]');
    expect(row.value).toMatch(/373B/);
    expect(row.value).toMatch(/293B/);
    const campbell = r.evidence.find((e) => e.check === 'claim: Trained by Bill Campbell');
    expect(campbell.value).toMatch(/not found/i);
  });

  it('legit sender: registration age, mail records and footprint all found; no mismatch flagged', async () => {
    const r = await runInboundCheck(fx('legit-vanta.eml'), deps());
    expect(r.lines[0]).toMatch(/say the same thing/);
    expect(r.lines[0]).not.toMatch(/don't line up/);
    expect(r.lines[1]).toMatch(/registered since 2002-09-09 \(through MarkMonitor Inc\.\)/);
    expect(r.lines[1]).toMatch(/show up where you'd expect/i);
    expect(r.lines[1]).toMatch(/set up to send and receive mail properly/);
    expect(r.evidence.find((e) => e.check === 'domain registered').label).toBe('[PUBLIC]');
    expect(r.lines[2]).toMatch(/no named claims/i);
  });

  it('display name / domain mismatch: named org, free-mail domain, different reply-to, a third domain in the body', async () => {
    const r = await runInboundCheck(fx('mismatch-sequoia.eml'), deps());
    expect(r.lines[0]).toMatch(/don't line up/);
    expect(r.lines[0]).toMatch(/a free gmail\.com mailbox/);
    expect(r.lines[0]).toMatch(/sequoia-capital-partners\.co/);
    expect(r.lines[0]).toMatch(/sequoiacap\.com/);
  });

  it('a lookup that fails says "couldn\'t check", never guesses', async () => {
    const broken = { ...deps(), resolver: { resolve4: async () => { throw new Error('SERVFAIL'); }, resolveMx: async () => { throw new Error('SERVFAIL'); }, resolveTxt: async () => { throw new Error('SERVFAIL'); } }, search: async () => ({ ok: false }), rdap: async () => { throw new Error('timeout'); } };
    const r = await runInboundCheck(fx('legit-vanta.eml'), broken);
    expect(r.lines[1]).toMatch(/couldn't look around the web this time/i);
    expect(r.lines[1]).toMatch(/couldn't find out when the domain was registered/i);
    expect(r.lines[1]).toMatch(/couldn't read its mail set-up/i);
    expect(r.lines[1]).not.toMatch(/couldn't find a trace/i);
    for (const e of r.evidence.filter((x) => ['can receive mail', 'sender check (SPF)', 'spoofing policy (DMARC)', 'domain registered', 'web footprint'].includes(x.check))) expect(e.value).toMatch(/couldn't check/i);
  });
});

describe('renderCheck — the HX rules', () => {
  const BANNED = /\byou (?:should|need|must|have to)\b|you're missing|don't click|\bscam\b|\bfraud\b|\bphishing\b|\bsuspicious\b|\bscore\b|\bverdict\b|\bfake\b|\bmalicious\b/i;
  for (const name of ['trigger-1-theadambarvcaps.eml', 'trigger-2-thejonathanjmvc.eml', 'legit-vanta.eml', 'mismatch-sequoia.eml']) {
    it(`${name}: three lines first, evidence table after, nothing scolds, nothing scores`, async () => {
      const r = await runInboundCheck(fx(name), deps());
      const out = renderCheck(r);
      const [head, ...rest] = out.split('\n\n');
      expect(head.split('\n')).toHaveLength(3);
      expect(rest.join('\n')).toMatch(/^\[(PUBLIC|VENDOR|DERIVED)\]/m);
      expect(out).not.toMatch(BANNED);
      expect(out).not.toMatch(/\b\d{1,3}\s*\/\s*100\b|\b\d{1,3}%\b/);
    });
  }
});
