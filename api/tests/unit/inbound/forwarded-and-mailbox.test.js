// The mailbox door: a founder forwards an email to check@ethikslabs.com and the three
// lines come back as a reply in the same thread. A plain forward strips the original
// envelope, signature and platform headers; the check says so rather than pretending.
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseEml } from '../../../src/services/inbound-check/parse-eml.js';
import { runInboundCheck, renderCheck } from '../../../src/services/inbound-check/index.js';
import { graphClient, pollOnce } from '../../../src/services/inbound-check/mailbox-m365.js';
import { isRegisteredEmail } from '../../../src/services/inbound-check/registry.js';
import { mkdirSync, writeFileSync } from 'node:fs';

const fx = (name) => readFileSync(join(process.cwd(), 'tests/fixtures/inbound', name), 'utf8');
const resolver = {
  resolve4: async () => ['203.0.113.5'],
  resolveMx: async () => [],
  resolveTxt: async () => [],
};
const deps = () => ({ resolver, rdap: async () => null, search: async () => ({ ok: true, found: false, urls: [] }), extract: async () => ({ entities: [], claims: [] }), memoryDir: mkdtempSync(join(tmpdir(), 'inbound-')), now: () => new Date('2026-09-14T02:00:00Z') });

describe('a plain forward: the sender inside the forwarded block is the subject of the check', () => {
  it('parseEml unwraps the Gmail forwarded block', () => {
    const m = parseEml(fx('forwarded-gmail-trigger-1.eml'));
    expect(m.forwarded).toBe(true);
    expect(m.forwardedBy.address).toBe('founder@example.com');
    expect(m.from).toEqual({ name: 'Jon Rosen', address: 'jon@theadambarvcaps.co', domain: 'theadambarvcaps.co', local: 'jon' });
    expect(m.headersSeen).toBe(false);
    expect(m.text).toContain('A few spots opened up');
    expect(m.text).not.toContain('Can you have a look at this one?');
    expect(m.esp).toBeNull(); // the founder's own Google headers are not the sender's platform
  });

  it('the three lines say what a forwarded copy cannot show, and still find the template', async () => {
    const r = await runInboundCheck(fx('forwarded-gmail-trigger-1.eml'), deps());
    expect(r.lines[0]).toMatch(/Jon Rosen/);
    expect(r.lines[0]).toMatch(/reached us as a forward \(via founder@example\.com\)/i);
    expect(r.lines[0]).not.toMatch(/say the same thing/);
    expect(r.lines[1]).toMatch(/couldn't find a trace/i);
    for (const check of ['where a reply goes', 'envelope posted from', 'signed by', 'sending platform']) {
      expect(r.evidence.find((e) => e.check === check).value).toMatch(/not seen in a forwarded copy/i);
    }
    expect(r.memory.template_signature).toBe('jon@the*vc*.co');
    expect(r.evidence.find((e) => e.check === 'from').value).toMatch(/jon@theadambarvcaps\.co/);
  });

  it('an Outlook forward of a reply of a pitch (multipart/related, mailto artefacts, wrapped quote header) resolves to the pitch', async () => {
    const m = parseEml(fx('forwarded-outlook-thread-trigger-1.eml'));
    expect(m.forwarded).toBe(true);
    expect(m.from.address).toBe('jon@theadambarvcaps.co');
    expect(m.via.map((v) => v.address)).toEqual(['founder@example.com', 'founder.personal@example.com']);
    expect(m.text).toMatch(/^Happy Sunday/);
    expect(m.text).not.toMatch(/interested|mailto:/);
    const r = await runInboundCheck(fx('forwarded-outlook-thread-trigger-1.eml'), deps());
    expect(r.lines[0]).toMatch(/someone signing as Jon Rosen, writing from theadambarvcaps\.co/);
    expect(r.lines[0]).toMatch(/via founder@example\.com, then founder\.personal@example\.com/);
    expect(r.evidence.find((e) => e.check === 'from').value).toMatch(/via founder@example\.com → founder\.personal@example\.com/);
    expect(r.memory.template_signature).toBe('jon@the*vc*.co');
  });

  it('the original, not forwarded, still reads the envelope', () => {
    const m = parseEml(fx('trigger-1-theadambarvcaps.eml'));
    expect(m.forwarded).toBe(false);
    expect(m.headersSeen).toBe(true);
  });
});

describe('mailbox poller — reads unread mail to the check address, replies in thread, files it', () => {
  let calls;
  const graph = ({ mimeFails = false } = {}) => {
    calls = [];
    const messages = [
      { id: 'm1', isRead: false, subject: 'Fwd: details', toRecipients: [{ emailAddress: { address: 'check@ethikslabs.com' } }], from: { emailAddress: { address: 'founder@example.com' } }, conversationId: 'c1' },
      { id: 'm2', isRead: false, subject: 'hello alfred', toRecipients: [{ emailAddress: { address: 'alfred@ethikslabs.com' } }], from: { emailAddress: { address: 'x@example.com' } } },
    ];
    const fetchImpl = async (url, opts = {}) => {
      const isJson = /application\/json/.test(opts.headers?.['Content-Type'] || '');
      calls.push({ url: String(url), method: opts.method || 'GET', body: opts.body && isJson ? JSON.parse(opts.body) : opts.body || null });
      const u = String(url);
      if (u.includes('/oauth2/v2.0/token')) return new Response(JSON.stringify({ access_token: 'tok', expires_in: 3600 }), { status: 200 });
      if (u.endsWith('/messages/m1/$value')) return mimeFails ? new Response('boom', { status: 500 }) : new Response(fx('forwarded-gmail-trigger-1.eml'), { status: 200 });
      if (/\/mailFolders\/inbox\/messages\?/.test(u)) return new Response(JSON.stringify({ value: messages }), { status: 200 });
      if (/\/messages\/m1\/reply$/.test(u)) return new Response('', { status: 202 });
      if (/\/messages\/m1$/.test(u) && opts.method === 'PATCH') return new Response(JSON.stringify({}), { status: 200 });
      if (/\/mailFolders\?/.test(u)) { const name = decodeURIComponent(u).match(/displayName eq '([^']+)'/)?.[1]; return new Response(JSON.stringify({ value: [{ id: `f-${name.toLowerCase()}`, displayName: name }] }), { status: 200 }); }
      if (/\/messages\/m1\/move$/.test(u)) return new Response(JSON.stringify({ id: 'm1-moved' }), { status: 201 });
      return new Response('not found: ' + u, { status: 404 });
    };
    return graphClient({ tenantId: 't', clientId: 'c', clientSecret: 's', mailbox: 'alfred@ethikslabs.com', fetchImpl });
  };
  const registry = { isRegistered: async (e) => e === 'founder@example.com' };

  it('handles only the message addressed to check@, replies with the three lines, marks it read and moves it', async () => {
    const g = graph();
    const out = await pollOnce({ graph: g, address: 'check@ethikslabs.com', deps: deps(), registry });
    expect(out.handled).toEqual(['m1']);
    expect(out.skipped).toEqual(['m2']);
    const reply = calls.find((c) => /\/messages\/m1\/reply$/.test(c.url));
    expect(reply).toBeDefined();
    expect(reply.body.comment).toMatch(/This came from someone signing as Jon Rosen/);
    expect(reply.body.comment).toMatch(/\[DERIVED\]/);
    expect(reply.body.comment).not.toMatch(/\byou (?:should|need)\b|\bscam\b/i);
    const patch = calls.find((c) => /\/messages\/m1$/.test(c.url) && c.method === 'PATCH');
    expect(patch.body).toEqual({ isRead: true });
    expect(calls.some((c) => /\/messages\/m1\/move$/.test(c.url) && c.body.destinationId === 'f-checked')).toBe(true);
    expect(calls.some((c) => /\/messages\/m2\//.test(c.url))).toBe(false);
  });

  it('never fetches anything but Graph and the token endpoint', async () => {
    const g = graph();
    await pollOnce({ graph: g, address: 'check@ethikslabs.com', deps: deps(), registry });
    for (const c of calls) expect(c.url).toMatch(/^https:\/\/(graph\.microsoft\.com|login\.microsoftonline\.com)\//);
  });

  it('an unregistered forwarder is pointed to proof360, nothing is looked up, nothing is stored', async () => {
    const g = graph();
    let looked = 0;
    const d = { ...deps(), search: async () => { looked += 1; return { ok: true, found: false, urls: [] }; } };
    const out = await pollOnce({ graph: g, address: 'check@ethikslabs.com', deps: d, registry: { isRegistered: async () => false }, baseUrl: 'https://proof360.au' });
    expect(out.declined).toEqual(['m1']);
    expect(out.handled).toEqual([]);
    expect(looked).toBe(0);
    expect(calls.some((c) => /\/messages\/m1\/\$value$/.test(c.url))).toBe(false);
    const reply = calls.find((c) => /\/messages\/m1\/reply$/.test(c.url));
    expect(reply.body.comment).toMatch(/https:\/\/proof360\.au/);
    expect(reply.body.comment).toMatch(/forward this email again/i);
    expect(reply.body.comment).not.toMatch(/\byou (?:should|need|must)\b|free.for.all/i);
    expect(calls.some((c) => /\/messages\/m1\/move$/.test(c.url) && c.body.destinationId === 'f-unregistered')).toBe(true);
  });

  it('the mailbox answers to more than one address: a comma list is accepted', async () => {
    const g = graph();
    const out = await pollOnce({ graph: g, address: 'check@ethiks360.com, check@ethikslabs.com', deps: deps(), registry });
    expect(out.handled).toEqual(['m1']);
  });

  it('no registry at all means nobody is registered (default-deny)', async () => {
    const g = graph();
    const out = await pollOnce({ graph: g, address: 'check@ethikslabs.com', deps: deps() });
    expect(out.declined).toEqual(['m1']);
  });

  it('a fetch that fails leaves the message unread and reports the error; no reply is sent', async () => {
    const g = graph({ mimeFails: true });
    const out = await pollOnce({ graph: g, address: 'check@ethikslabs.com', deps: deps(), registry });
    expect(out.handled).toEqual([]);
    expect(out.errors.length).toBe(1);
    expect(calls.some((c) => /\/reply$/.test(c.url))).toBe(false);
  });
});

describe('the registry: a founder record with that email, nothing else', () => {
  it('finds a founder by the email Auth0 verified, case-insensitively; misses everyone else', async () => {
    const root = mkdtempSync(join(tmpdir(), 'founders-'));
    mkdirSync(join(root, 'founders', 'abc'), { recursive: true });
    writeFileSync(join(root, 'founders', 'abc', 'founder.json'), JSON.stringify({ id: '1', email: 'Founder@Example.com', auth0_sub: 'x' }));
    expect(await isRegisteredEmail('founder@example.com', { root })).toBe(true);
    expect(await isRegisteredEmail('someone@else.com', { root })).toBe(false);
    expect(await isRegisteredEmail('', { root })).toBe(false);
    expect(await isRegisteredEmail('founder@example.com', { root: join(root, 'nope') })).toBe(false);
  });
});
