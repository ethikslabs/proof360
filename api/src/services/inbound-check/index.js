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
  if (m.replyToDomain && m.replyToDomain !== from.domain) mismatches.push(`replies go to ${m.replyToDomain}`);
  if (m.returnPathDomain && m.returnPathDomain !== from.domain) mismatches.push(`the envelope came from ${m.returnPathDomain}`);
  const dkimOther = m.dkimDomains.filter((d) => d !== from.domain && !/^(google\.com|1e100\.net|amazonses\.com)$/.test(d));
  if (m.dkimDomains.length && !m.dkimDomains.includes(from.domain) && dkimOther.length) mismatches.push(`the signature is from ${dkimOther.join(', ')}`);
  if (from.name && ORG_WORDS.test(from.name)) {
    const tokens = from.name.toLowerCase().replace(ORG_WORDS, ' ').split(/[^a-z0-9]+/).filter((t) => t.length >= 4);
    const inDomain = tokens.some((t) => from.domain.includes(t));
    if (!inDomain) mismatches.push(`the display name "${from.name}" names an organisation the address ${m.freemail ? `(${from.domain}, a free mailbox) ` : ''}does not`);
  }
  // Domains in the body are named, never counted as a mismatch on their own: a calendly
  // link is not an identity claim. They sit beside the sender so the reader can compare.
  const alsoNames = m.bodyDomains.length ? ` The body also names ${m.bodyDomains.join(', ')}.` : '';
  evidence.push({ label: '[DERIVED]', check: 'from', value: `${from.name ? `${from.name} ` : ''}<${from.address}>` });
  evidence.push({ label: '[DERIVED]', check: 'reply-to', value: m.replyToDomain || 'same as from' });
  evidence.push({ label: '[DERIVED]', check: 'envelope', value: m.returnPathDomain || 'not present' });
  evidence.push({ label: '[DERIVED]', check: 'signature (DKIM)', value: m.dkimDomains.length ? m.dkimDomains.join(', ') : 'none' });
  evidence.push({ label: '[DERIVED]', check: 'domains named in the body', value: m.bodyDomains.length ? m.bodyDomains.join(', ') : 'none' });
  evidence.push({ label: '[DERIVED]', check: 'sending platform', value: m.esp ? `${m.esp} (from the headers)` : 'no platform mark in the headers' });
  const who = `${from.name || from.local} at ${from.domain}`;
  if (!mismatches.length) return `Who really sent it: ${who}. The address, the envelope and the signature agree.${alsoNames || ' The body names no other domain.'}`;
  return `Who really sent it: ${who}, with a mismatch: ${mismatches.join('; ')}.${alsoNames}`;
}

// Line 2 — does the sender exist anywhere.
async function footprintLine(m, dom, { search }, evidence) {
  const { registration: reg } = dom;
  let regText;
  if (!reg.ok) regText = `registration age ${COULDNT}`;
  else if (!reg.answered) regText = `registration age ${COULDNT} (no registry service answered for .${m.from.domain.split('.').pop()})`;
  else if (reg.date) regText = `registered ${reg.date.slice(0, 10)}${reg.registrar ? ` via ${reg.registrar}` : ''}`;
  else regText = `registered, date not published${reg.registrar ? ` (${reg.registrar})` : ''}`;
  evidence.push({ label: '[PUBLIC]', check: 'registration', value: reg.ok && reg.answered ? (reg.date ? `${reg.date.slice(0, 10)}${reg.registrar ? ` · ${reg.registrar}` : ''}` : 'registered, date not published') : COULDNT });
  evidence.push({ label: '[PUBLIC]', check: 'A record', value: yesNo(dom.a) });
  evidence.push({ label: '[PUBLIC]', check: 'MX', value: yesNo(dom.mx) });
  evidence.push({ label: '[PUBLIC]', check: 'SPF', value: yesNo(dom.spf) });
  evidence.push({ label: '[PUBLIC]', check: 'DMARC', value: dom.dmarc === undefined ? COULDNT : dom.dmarc ? `present (p=${dom.dmarcPolicy})` : 'none' });
  const mail = [dom.mx, dom.spf, dom.dmarc];
  const mailText = mail.every((v) => v === undefined) ? `mail records ${COULDNT}`
    : `mail records: MX ${yesNo(dom.mx)}, SPF ${yesNo(dom.spf)}, DMARC ${yesNo(dom.dmarc)}`;

  const queries = [m.from.domain, m.from.name ? `"${m.from.name}" ${m.from.domain}` : null].filter(Boolean);
  const results = await Promise.all(queries.map((q) => search(q).catch(() => ({ ok: false }))));
  const answered = results.filter((r) => r?.ok);
  const found = answered.filter((r) => r.found);
  let webText, webValue;
  if (!answered.length) { webText = `web footprint ${COULDNT}`; webValue = COULDNT; }
  else if (found.length) { webText = 'web footprint found'; webValue = `found · ${[...new Set(found.flatMap((r) => r.urls || []))].slice(0, 3).join(' ') || 'pages indexed'}`; }
  else { webText = `no footprint on the web for the domain${m.from.name ? ' or the name' : ''}`; webValue = `none indexed for ${queries.join(' / ')}`; }
  evidence.push({ label: '[VENDOR]', check: 'web footprint', value: webValue });
  return `Does the sender exist anywhere: ${regText}; ${mailText}; ${webText}.`;
}

function normNum(v) { return v == null ? null : String(v).replace(/[^0-9a-z.]/gi, '').toUpperCase(); }

// Line 3 — does the pitch match the record.
async function claimsLine(m, { extract, search }, evidence) {
  let extracted;
  try { extracted = await extract(m.text); } catch { extracted = null; }
  if (!extracted) return `Does the pitch match the record: named claims ${COULDNT}.`;
  const claims = extracted.claims || [];
  if (!claims.length) return 'Does the pitch match the record: no named claims to check in this email.';
  const tally = { found: 0, not_found: 0, conflicting: 0, unchecked: 0 };
  const conflicts = [];
  // One search per claim, all at once: the 30 s budget is for the whole check.
  const answers = await Promise.all(claims.map((c) => search(`${c.subject} ${c.claim}`).catch(() => ({ ok: false }))));
  claims.forEach((c, i) => {
    const r = answers[i];
    let value;
    if (!r?.ok) { tally.unchecked += 1; value = COULDNT; }
    else if (!r.found) { tally.not_found += 1; value = "not found on the person's or company's own surfaces"; }
    else if (c.value && r.value && normNum(c.value) !== normNum(r.value)) {
      tally.conflicting += 1; conflicts.push(`${c.value} in the email vs ${r.value} on ${c.subject}'s own surface`);
      value = `conflicting: the email says ${c.value}, the own surface says ${r.value}${r.urls?.[0] ? ` (${r.urls[0]})` : ''}`;
    } else { tally.found += 1; value = `found${r.urls?.[0] ? ` (${r.urls[0]})` : ''}`; }
    evidence.push({ label: '[VENDOR]', check: `claim: ${c.claim}`, value, subject: c.subject });
  });
  const parts = [`${claims.length} named claim${claims.length === 1 ? '' : 's'} checked`];
  if (tally.found) parts.push(`${tally.found} found`);
  if (tally.not_found) parts.push(`${tally.not_found} not found`);
  if (tally.conflicting) parts.push(`${tally.conflicting} conflicting (${conflicts.join('; ')})`);
  if (tally.unchecked) parts.push(`${tally.unchecked} ${COULDNT}`);
  return `Does the pitch match the record: ${parts.join(', ')}.`;
}

export async function runInboundCheck(emlText, deps) {
  const { resolver, rdap, search, extract, memoryDir, now = () => new Date() } = deps;
  const m = parseEml(emlText);
  if (!m.from) throw new Error('no From address in this email');
  const evidence = [];
  const checked_at = now().toISOString();

  const dom = await lookupDomain(m.from.domain, { resolver, rdap });
  const line1 = senderLine(m, evidence);
  const line2 = await footprintLine(m, dom, { search }, evidence);
  const line3 = await claimsLine(m, { extract, search }, evidence);

  const signature = templateSignature(m.from.local, m.from.domain);
  const prior = await priorSenders(memoryDir, signature, { excludeAddress: m.from.address });
  evidence.push({ label: '[DERIVED]', check: 'template shape', value: isShaped(signature) ? `${signature} (a generator shape)` : 'no generator shape' });
  evidence.push({
    label: '[DERIVED]', check: 'prior senders, same template',
    value: prior.length ? `${prior.length} prior sender${prior.length === 1 ? '' : 's'} matched this template: ${prior.map((p) => `${p.address} (${p.checked_at.slice(0, 10)})`).join(', ')}` : 'none on record',
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
