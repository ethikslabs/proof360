// Inbound Trust Check ("Check this") — one input, three lines, evidence below the fold.
// Every evidence row is labelled [PUBLIC] (a registry or DNS answered), [VENDOR] (a search
// or model answered) or [DERIVED] (we worked it out from what was in front of us).
// No score. No verdict word. No "you should". A failed lookup says "couldn't check".
// Read-only: DNS, RDAP and search only; the sender's own domain is never fetched.
import { parseEml } from './parse-eml.js';
import { templateSignature, isShaped } from './template.js';
import { priorSenders, recordSender } from './pattern-memory.js';

const COULDNT = "couldn't check";
const ORG_WORDS = /\b(capital|ventures?|vc|partners?|fund|inc|llc|ltd|group|labs|bank|holdings|advisors|equity|investments?)\b/i;

async function guarded(fn) {
  try { return { ok: true, value: await fn() }; } catch (err) {
    if (['ENOTFOUND', 'ENODATA', 'ENONAME'].includes(err?.code)) return { ok: true, value: [] };
    return { ok: false, value: null };
  }
}

async function lookupDomain(domain, { resolver, rdap }) {
  const [a, mx, txt, dmarc, reg] = await Promise.all([
    guarded(() => resolver.resolve4(domain)),
    guarded(() => resolver.resolveMx(domain)),
    guarded(() => resolver.resolveTxt(domain)),
    guarded(() => resolver.resolveTxt(`_dmarc.${domain}`)),
    guarded(() => rdap(domain)),
  ]);
  const flat = (r) => (r.ok ? r.value.map((x) => (Array.isArray(x) ? x.join('') : x)) : []);
  const spf = txt.ok ? flat(txt).find((t) => /^v=spf1/i.test(t)) || null : undefined;
  const dm = dmarc.ok ? flat(dmarc).find((t) => /^v=DMARC1/i.test(t)) || null : undefined;
  let registration;
  if (!reg.ok) registration = { ok: false };
  else if (!reg.value) registration = { ok: true, answered: false };
  else {
    const ev = (reg.value.events || []).find((e) => e.eventAction === 'registration');
    const registrar = (reg.value.entities || []).find((e) => (e.roles || []).includes('registrar'))?.vcardArray?.[1]?.find((v) => v[0] === 'fn')?.[3] || null;
    registration = { ok: true, answered: true, date: ev?.eventDate || null, registrar };
  }
  return {
    a: a.ok ? a.value.length > 0 : undefined,
    mx: mx.ok ? mx.value.length > 0 : undefined,
    spf: spf === undefined ? undefined : !!spf,
    dmarc: dm === undefined ? undefined : !!dm,
    dmarcPolicy: dm ? (dm.match(/\bp=(\w+)/i)?.[1] || 'none').toLowerCase() : null,
    registration,
  };
}

function yesNo(v) { return v === undefined ? COULDNT : v ? 'present' : 'none'; }

// Line 1 — who really sent it.
function senderLine(m, evidence) {
  const from = m.from;
  const mismatches = [];
  if (m.replyToDomain && m.replyToDomain !== from.domain) mismatches.push(`a reply would go to ${m.replyToDomain}, not to the address it came from`);
  if (m.returnPathDomain && m.returnPathDomain !== from.domain) mismatches.push(`the envelope was posted from ${m.returnPathDomain}`);
  const dkimOther = m.dkimDomains.filter((d) => d !== from.domain && !/^(google\.com|1e100\.net|amazonses\.com)$/.test(d));
  if (m.dkimDomains.length && !m.dkimDomains.includes(from.domain) && dkimOther.length) mismatches.push(`the signature belongs to ${dkimOther.join(', ')}`);
  if (from.name && ORG_WORDS.test(from.name)) {
    const tokens = from.name.toLowerCase().replace(ORG_WORDS, ' ').split(/[^a-z0-9]+/).filter((t) => t.length >= 4);
    const inDomain = tokens.some((t) => from.domain.includes(t));
    if (!inDomain) mismatches.push(`the name says ${from.name} but the address is ${m.freemail ? `a free ${from.domain} mailbox` : `on ${from.domain}`}, which is not the same thing`);
  }
  // Domains in the body are named, never counted as a mismatch on their own: a calendly
  // link is not an identity claim. They sit beside the sender so the reader can compare.
  const alsoNames = m.bodyDomains.length ? ` The body also names ${m.bodyDomains.join(', ')}.` : '';
  const NOT_SEEN = 'not seen in a forwarded copy';
  evidence.push({ label: '[DERIVED]', check: 'from', value: `${from.name ? `${from.name} ` : ''}<${from.address}>${m.forwarded ? ` (reached us via ${(m.via || [m.forwardedBy]).map((v) => v.address).join(' → ')})` : ''}` });
  evidence.push({ label: '[DERIVED]', check: 'where a reply goes', value: m.headersSeen ? m.replyToDomain || 'back to the same address' : NOT_SEEN });
  evidence.push({ label: '[DERIVED]', check: 'envelope posted from', value: m.headersSeen ? m.returnPathDomain || 'not shown' : NOT_SEEN });
  evidence.push({ label: '[DERIVED]', check: 'signed by', value: m.headersSeen ? (m.dkimDomains.length ? m.dkimDomains.join(', ') : 'nobody') : NOT_SEEN });
  evidence.push({ label: '[DERIVED]', check: 'other places the email points at', value: m.bodyDomains.length ? m.bodyDomains.join(', ') : 'none' });
  evidence.push({ label: '[DERIVED]', check: 'sending platform', value: m.headersSeen ? (m.esp ? `${m.esp}, a bulk-outreach tool, left its mark in the headers` : 'no bulk-outreach tool left a mark') : NOT_SEEN });
  const who = from.name ? `someone signing as ${from.name}, writing from ${from.domain}` : `${from.local} at ${from.domain}`;
  const also = m.bodyDomains.length ? ` The email also points at ${m.bodyDomains.join(' and ')}.` : '';
  if (!m.headersSeen) {
    const path = (m.via || [m.forwardedBy]).map((v) => v.address).join(', then ');
    const note = mismatches.length ? ` One thing worth knowing: ${mismatches.join('; ')}.` : '';
    return `This came from ${who}. It reached us as a forward (via ${path}), so we could read the address and the words, not the envelope it travelled in.${note}${also}`;
  }
  if (!mismatches.length) return `This came from ${who}, and the address, the envelope and the signature all say the same thing.${also || ' Nothing else is named in it.'}`;
  return `This came from ${who}, and the parts don't line up: ${mismatches.join('; ')}.${also}`;
}

// Line 2 — does the sender exist anywhere.
async function footprintLine(m, dom, { search }, evidence, shape) {
  const { registration: reg } = dom;
  const tld = m.from.domain.split('.').pop();
  let regText;
  if (!reg.ok) regText = `we couldn't find out when the domain was registered`;
  else if (!reg.answered) regText = `we couldn't find out when the domain was registered (the .${tld} registry doesn't answer that question)`;
  else if (reg.date) regText = `the domain has been registered since ${reg.date.slice(0, 10)}${reg.registrar ? ` (through ${reg.registrar})` : ''}`;
  else regText = `the domain is registered, date not published`;
  evidence.push({ label: '[PUBLIC]', check: 'domain registered', value: reg.ok && reg.answered ? (reg.date ? `${reg.date.slice(0, 10)}${reg.registrar ? ` · ${reg.registrar}` : ''}` : 'yes, date not published') : COULDNT });
  evidence.push({ label: '[PUBLIC]', check: 'has a website address', value: yesNo(dom.a) });
  evidence.push({ label: '[PUBLIC]', check: 'can receive mail', value: yesNo(dom.mx) });
  evidence.push({ label: '[PUBLIC]', check: 'sender check (SPF)', value: yesNo(dom.spf) });
  evidence.push({ label: '[PUBLIC]', check: 'spoofing policy (DMARC)', value: dom.dmarc === undefined ? COULDNT : dom.dmarc ? `in place (${dom.dmarcPolicy})` : 'none' });
  const mail = [dom.mx, dom.spf, dom.dmarc];
  let mailText;
  if (mail.every((v) => v === undefined)) mailText = `we couldn't read its mail set-up`;
  else if (dom.mx && dom.spf && dom.dmarc) mailText = `the domain is set up to send and receive mail properly`;
  else if (dom.mx === false && !dom.spf && !dom.dmarc) mailText = `the domain isn't set up to receive mail at all`;
  else mailText = `the domain's mail set-up is partial (${[dom.mx ? 'can receive mail' : 'cannot receive mail', dom.spf ? 'sender check in place' : 'no sender check', dom.dmarc ? 'spoofing policy in place' : 'no spoofing policy'].join(', ')})`;

  const queries = [m.from.domain, m.from.name ? `"${m.from.name}" ${m.from.domain}` : null].filter(Boolean);
  const results = await Promise.all(queries.map((q) => search(q).catch(() => ({ ok: false }))));
  const answered = results.filter((r) => r?.ok);
  const found = answered.filter((r) => r.found);
  let webText, webValue;
  if (!answered.length) { webText = `we couldn't look around the web this time`; webValue = COULDNT; }
  else if (found.length) { webText = `looking around the web, the company${m.from.name ? ' and the name' : ''} show up where you'd expect`; webValue = `found · ${[...new Set(found.flatMap((r) => r.urls || []))].slice(0, 3).join(' ') || 'pages indexed'}`; }
  else { webText = `looking around the web, we couldn't find a trace of the company${m.from.name ? ' or the name' : ''}`; webValue = `no footprint · nothing indexed for ${queries.join(' / ')}`; }
  evidence.push({ label: '[VENDOR]', check: 'web footprint', value: webValue });

  let shapeText = '';
  if (shape.shaped) {
    const n = shape.prior.length;
    shapeText = n
      ? ` One more thing: the address is built to a pattern (${shape.signature}), and ${n === 1 ? 'one other sender' : `${n} other senders`} with the same pattern ${n === 1 ? 'has' : 'have'} been through here before (${shape.prior.map((p) => `${p.address}, ${p.checked_at.slice(0, 10)}`).join('; ')}).`
      : ` The address is built to a pattern (${shape.signature}); no other sender with that pattern has been through here yet.`;
  }
  return `${cap(webText)}; ${regText}; ${mailText}.${shapeText}`;
}

const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);

function normNum(v) { return v == null ? null : String(v).replace(/[^0-9a-z.]/gi, '').toUpperCase(); }

// Line 3 — does the pitch match the record.
async function claimsLine(m, { extract, search }, evidence) {
  let extracted;
  try { extracted = await extract(m.text); } catch { extracted = null; }
  if (!extracted) return `We couldn't pull the claims out of this one to check them.`;
  const claims = extracted.claims || [];
  if (!claims.length) return 'There are no named claims in this one to check against the record.';
  const tally = { found: 0, not_found: 0, conflicting: 0, unchecked: 0 };
  const conflicts = [];
  // One search per claim, all at once: the 30 s budget is for the whole check.
  const answers = await Promise.all(claims.map((c) => search(`${c.subject} ${c.claim}`).catch(() => ({ ok: false }))));
  claims.forEach((c, i) => {
    const r = answers[i];
    let value;
    if (!r?.ok) { tally.unchecked += 1; value = COULDNT; }
    else if (!r.found) { tally.not_found += 1; value = "not found on the person's or company's own pages"; }
    else if (c.value && r.value && normNum(c.value) !== normNum(r.value)) {
      tally.conflicting += 1; conflicts.push(`the email says ${c.value}, ${c.subject}'s own page says ${r.value}`);
      value = `the numbers don't agree: the email says ${c.value}, the own page says ${r.value}${r.urls?.[0] ? ` (${r.urls[0]})` : ''}`;
    } else { tally.found += 1; value = `found${r.urls?.[0] ? ` (${r.urls[0]})` : ''}`; }
    evidence.push({ label: '[VENDOR]', check: `claim: ${c.claim}`, value, subject: c.subject });
  });
  const n = claims.length;
  const parts = [];
  if (tally.found) parts.push(`${tally.found} ${tally.found === 1 ? 'is' : 'are'} on the person's own pages`);
  if (tally.not_found) parts.push(`${tally.not_found} ${tally.not_found === 1 ? "isn't" : "aren't"} anywhere we could find`);
  if (tally.conflicting) parts.push(`${tally.conflicting} ${tally.conflicting === 1 ? "doesn't" : "don't"} match the record (${conflicts.join('; ')})`);
  if (tally.unchecked) parts.push(`${tally.unchecked} we couldn't check this time`);
  return `The email makes ${n} ${n === 1 ? 'claim' : 'claims'} we could look for: ${parts.join(', ')}.`;
}

export async function runInboundCheck(emlText, deps) {
  const { resolver, rdap, search, extract, memoryDir, now = () => new Date() } = deps;
  const m = parseEml(emlText);
  if (!m.from) throw new Error('no From address in this email');
  const evidence = [];
  const checked_at = now().toISOString();

  const signature = templateSignature(m.from.local, m.from.domain);
  const prior = await priorSenders(memoryDir, signature, { excludeAddress: m.from.address });
  const shape = { signature, shaped: isShaped(signature), prior };

  const dom = await lookupDomain(m.from.domain, { resolver, rdap });
  const line1 = senderLine(m, evidence);
  const line2 = await footprintLine(m, dom, { search }, evidence, shape);
  const line3 = await claimsLine(m, { extract, search }, evidence);

  evidence.push({ label: '[DERIVED]', check: 'address pattern', value: shape.shaped ? `${signature} (built to a pattern)` : 'no pattern' });
  evidence.push({
    label: '[DERIVED]', check: 'earlier senders with this pattern',
    value: prior.length ? `${prior.length}: ${prior.map((p) => `${p.address} (${p.checked_at.slice(0, 10)})`).join(', ')}` : 'none so far',
  });
  await recordSender(memoryDir, { address: m.from.address, local: m.from.local, domain: m.from.domain, template_signature: signature, esp: m.esp, checked_at });

  return {
    checked_at,
    sender: m.from,
    lines: [line1, line2, line3],
    evidence,
    memory: { template_signature: signature, prior_matches: prior.length, prior },
  };
}

export function renderCheck(r) {
  const rows = r.evidence.map((e) => `${e.label} ${e.check} · ${e.value}`);
  return [r.lines.join('\n'), rows.join('\n')].join('\n\n');
}
