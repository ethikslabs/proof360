// Inbound Trust Check — parse a raw .eml into what the three lines need. Pure: reads
// text, fetches nothing, loads no pixel. Headers are the input; nothing here is a lookup.

const FREEMAIL = new Set(['gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com', 'yahoo.com', 'icloud.com', 'proton.me', 'protonmail.com', 'aol.com', 'mail.com', 'gmx.com']);

// Sending-platform fingerprints, matched against headers and hosts. Derived, not public.
const ESP_MARKS = [
  [/instantly\.ai/i, 'Instantly'],
  [/hs-sales-engage|hubspot/i, 'HubSpot Sales'],
  [/lemlist/i, 'lemlist'],
  [/apollo\.io/i, 'Apollo'],
  [/outreach\.io/i, 'Outreach'],
  [/salesloft/i, 'Salesloft'],
  [/sendgrid/i, 'SendGrid'],
  [/mailgun/i, 'Mailgun'],
  [/amazonses|email-smtp\.[a-z0-9-]+\.amazonaws/i, 'Amazon SES'],
  [/mandrill|mailchimp/i, 'Mailchimp'],
  [/sendinblue|brevo/i, 'Brevo'],
  [/klaviyo/i, 'Klaviyo'],
];

function splitHeadersBody(raw) {
  const m = raw.match(/\r?\n\r?\n/);
  if (!m) return { head: raw, body: '' };
  return { head: raw.slice(0, m.index), body: raw.slice(m.index + m[0].length) };
}

function unfold(head) {
  return head.replace(/\r?\n[ \t]+/g, ' ').split(/\r?\n/);
}

export function parseHeaders(head) {
  const map = {};
  for (const line of unfold(head)) {
    const i = line.indexOf(':');
    if (i < 1) continue;
    const name = line.slice(0, i).trim().toLowerCase();
    const value = line.slice(i + 1).trim();
    (map[name] ||= []).push(value);
  }
  return map;
}

export function parseAddress(value) {
  if (!value) return null;
  const angle = value.match(/^\s*(?:"?([^"<]*)"?\s*)?<([^>]+)>\s*$/);
  let name = '', address = '';
  if (angle) { name = (angle[1] || '').trim(); address = angle[2].trim(); }
  else { const bare = value.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i); if (!bare) return null; address = bare[0]; }
  address = address.toLowerCase();
  const at = address.lastIndexOf('@');
  return { name, address, domain: address.slice(at + 1), local: address.slice(0, at) };
}

function decodeQuotedPrintable(s) {
  return s.replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

function decodeBody(body, headers) {
  const cte = (headers['content-transfer-encoding']?.[0] || '').toLowerCase();
  if (cte === 'quoted-printable') return Buffer.from(decodeQuotedPrintable(body), 'latin1').toString('utf8');
  if (cte === 'base64') return Buffer.from(body.replace(/\s+/g, ''), 'base64').toString('utf8');
  return body;
}

// Pick the text/plain part of a multipart message; fall back to the body as-is.
function textPart(body, headers) {
  const ct = headers['content-type']?.[0] || '';
  const b = ct.match(/boundary="?([^";]+)"?/i);
  if (!b) return decodeBody(body, headers);
  const parts = body.split(new RegExp(`--${b[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:--)?\\r?\\n`)).slice(1);
  for (const p of parts) {
    const { head, body: pb } = splitHeadersBody(p);
    const ph = parseHeaders(head);
    if (/text\/plain/i.test(ph['content-type']?.[0] || '')) return decodeBody(pb, ph);
  }
  for (const p of parts) {
    const { head, body: pb } = splitHeadersBody(p);
    const ph = parseHeaders(head);
    if (/text\/html/i.test(ph['content-type']?.[0] || '')) return decodeBody(pb, ph).replace(/<[^>]+>/g, ' ');
  }
  return '';
}

function domainsIn(text) {
  const out = new Set();
  for (const m of text.matchAll(/https?:\/\/([a-z0-9.-]+\.[a-z]{2,})/gi)) out.add(m[1].toLowerCase().replace(/^www\./, ''));
  for (const m of text.matchAll(/(?<![\w@/.])((?:[a-z0-9-]+\.)+(?:com|co|io|ai|net|org|vc|capital|ventures|uk|au|de|fr|us|ca))(?![\w.])/gi)) out.add(m[1].toLowerCase().replace(/^www\./, ''));
  return [...out];
}

// A plain forward (Gmail "---------- Forwarded message ---------", Outlook "From: … Sent: …")
// carries the original sender only as text. Find that block, take the inner From, Date and
// Subject, and keep only the forwarded body. What the block cannot carry (envelope,
// signature, platform headers) is reported as not seen, never guessed.
const FWD_MARKERS = [
  /^-{3,}\s*Forwarded message\s*-{3,}\s*$/im,
  /^-{3,}\s*Original Message\s*-{3,}\s*$/im,
  /^Begin forwarded message:\s*$/im,
  /^From:\s.+\r?\nSent:\s.+\r?\nTo:\s.+/im, // Outlook, no dashed marker
];
export function unwrapForward(text) {
  for (const re of FWD_MARKERS) {
    const m = text.match(re);
    if (!m) continue;
    const start = m.index + (re.source.startsWith('^From') ? 0 : m[0].length);
    const block = text.slice(start).replace(/^\s+/, '');
    const inner = {};
    const lines = block.split(/\r?\n/);
    let i = 0;
    for (; i < lines.length; i += 1) {
      const l = lines[i].replace(/^\*|\*$/g, '');
      const h = l.match(/^(From|Date|Sent|Subject|To|Cc):\s*(.*)$/i);
      if (!h) { if (l.trim() === '' && Object.keys(inner).length) break; if (Object.keys(inner).length) break; continue; }
      inner[h[1].toLowerCase()] = h[2].trim();
    }
    const from = parseAddress(inner.from?.replace(/\s*\[mailto:[^\]]+\]/i, ''));
    if (!from) continue;
    return { from, date: inner.date || inner.sent || '', subject: inner.subject || '', text: lines.slice(i).join('\n').trim() };
  }
  return null;
}

export function parseEml(raw) {
  const { head, body } = splitHeadersBody(raw);
  const headers = parseHeaders(head);
  const outerFrom = parseAddress(headers.from?.[0]);
  const replyTo = parseAddress(headers['reply-to']?.[0]);
  const returnPath = parseAddress(headers['return-path']?.[0]);
  const dkimDomains = (headers['dkim-signature'] || []).map((v) => v.match(/\bd=([^;\s]+)/i)?.[1]?.toLowerCase()).filter(Boolean);
  const receivedHosts = (headers.received || []).map((v) => v.match(/^from\s+(\S+)(?:\s+\(([^)]*)\))?/i)).filter(Boolean).flatMap((m) => [m[1], m[2]].filter(Boolean));
  const authResults = headers['authentication-results']?.[0] || '';
  const rawText = textPart(body, headers);
  // Drop quoted replies: the claims are the sender's, not the founder's own earlier words.
  let text = rawText.split(/\r?\n/).filter((l) => !/^\s*>/.test(l)).join('\n').replace(/\r/g, '').trim();
  const fwd = unwrapForward(text);
  const forwarded = !!(fwd && fwd.from.address !== outerFrom?.address);
  const from = forwarded ? fwd.from : outerFrom;
  if (forwarded) text = fwd.text;
  // Headers belong to the sender only when the mail came straight from them. In a forwarded
  // copy the envelope, signature, received chain and platform marks are the forwarder's.
  const headersSeen = !forwarded;
  const hay = headersSeen ? [head, ...receivedHosts, text].join('\n') : text;
  const esp = ESP_MARKS.find(([re]) => re.test(hay))?.[1] || null;
  const bodyDomains = domainsIn(text).filter((d) => d !== from?.domain);
  return {
    headers, from, outerFrom,
    forwarded, forwardedBy: forwarded ? outerFrom : null, headersSeen,
    replyTo: headersSeen ? replyTo : null, returnPath: headersSeen ? returnPath : null,
    replyToDomain: headersSeen ? replyTo?.domain || null : null,
    returnPathDomain: headersSeen ? returnPath?.domain || null : null,
    dkimDomains: headersSeen ? dkimDomains : [], receivedHosts: headersSeen ? receivedHosts : [], authResults: headersSeen ? authResults : '',
    esp, text, bodyDomains,
    subject: forwarded ? fwd.subject || headers.subject?.[0] || '' : headers.subject?.[0] || '',
    date: forwarded ? fwd.date : headers.date?.[0] || '',
    freemail: from ? FREEMAIL.has(from.domain) : false,
  };
}
