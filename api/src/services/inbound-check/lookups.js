// The real lookups behind the inbound check. Read-only by construction: DNS, RDAP and a
// search engine. The sender's own domain is never fetched, no link is followed, no pixel
// loads. Each returns the shape the check expects, or throws so the check says
// "couldn't check". Spend is metered like every other proof360 provider call.
import { promises as dns } from 'node:dns';
import { chatComplete } from '../../lib/inference.js';
import * as meter from '../../lib/meter.mjs';

export const resolver = {
  resolve4: (d) => dns.resolve4(d),
  resolveMx: (d) => dns.resolveMx(d),
  resolveTxt: (h) => dns.resolveTxt(h),
};

const RDAP_BOOTSTRAP = 'https://rdap.org/domain/';
// rdap.org redirects to the registry's own RDAP server. A 404 means no service answered
// for that TLD (true for .co at the time of writing); the check says so rather than guessing.
export async function rdap(domain, { timeoutMs = 8000 } = {}) {
  const res = await fetch(RDAP_BOOTSTRAP + encodeURIComponent(domain), { redirect: 'follow', signal: AbortSignal.timeout(timeoutMs), headers: { accept: 'application/rdap+json, application/json' } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`rdap ${res.status}`);
  return res.json();
}

const PERPLEXITY_URL = 'https://api.perplexity.ai/chat/completions';
function parseJsonLoose(text) {
  const m = String(text || '').match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

// One search per query. Asks for a strict JSON answer: found on the entity's own or an
// independent public surface, the value seen there, and the URLs. "Not found" is an
// answer. Labelled [VENDOR] by the caller because a model summarised the web.
export async function search(query, { timeoutMs = 12000 } = {}) {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) throw new Error('no PERPLEXITY_API_KEY');
  const prompt = [
    `Search the public web for: ${query}`,
    'Answer ONLY with JSON: {"found": true|false, "value": string|null, "urls": [string], "summary": string|null}.',
    '"found" is true only if you located a page on the subject\'s own website or profile, or a named news or registry source, that explicitly names this exact domain, person or claim. A page that merely contains similar words is not found.',
    '"urls" must be the pages that support "found"; with no supporting page, "found" is false.',
    'If the query contains a number or amount, "value" is the corresponding number as it appears on the subject\'s own website or profile (null if none).',
    'Never invent a page. If nothing is indexed, return {"found": false, "value": null, "urls": [], "summary": null}.',
  ].join('\n');
  const res = await fetch(PERPLEXITY_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'sonar', messages: [{ role: 'user', content: prompt }], max_tokens: 400, temperature: 0 }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`perplexity ${res.status}`);
  const data = await res.json();
  try { meter.emit({ provider: 'perplexity', model: 'sonar', ...meter.extractUsage(data) }); } catch { /* metering never breaks the check */ }
  const parsed = parseJsonLoose(data.choices?.[0]?.message?.content);
  if (!parsed) throw new Error('perplexity: no JSON answer');
  const cited = Array.isArray(data.citations) ? data.citations : [];
  const urls = [...new Set([...(parsed.urls || []), ...cited])].slice(0, 5);
  return { ok: true, found: parsed.found === true && (parsed.urls || []).length > 0, value: parsed.value ?? null, urls, summary: parsed.summary ?? null };
}

// Named entities and the big claims made about them, pulled by the model. The model
// extracts; it never judges. Each claim is then one search, above.
export async function extract(text) {
  const messages = [
    { role: 'system', content: 'You extract the checkable claims a sender makes about themselves, their firm, or the people and organisations they name, from an email. Output JSON only: {"entities":[{"name":string,"kind":"person"|"company"}],"claims":[{"subject":string,"claim":string,"value":string|null}]}. A claim is a specific statement about a named person or organisation that could be checked against their own public surfaces: an exit or fund size, a credential or alma mater, a job title, a named endorser or mentor ("trained by X"), an affiliation ("Goldman Sachs alum"), a named investor backing a named company. Skip statements about the recipient, event logistics, dates, locations, links, and vague marketing. "subject" is the person or organisation the claim is about. "value" is the number or amount in the claim if there is one (e.g. "373B"), else null. No commentary. Maximum 6 claims.' },
    { role: 'user', content: text.slice(0, 6000) },
  ];
  const res = await chatComplete({ messages, max_tokens: 600, temperature: 0, act: 'inbound-check extract' });
  const parsed = parseJsonLoose(res?.choices?.[0]?.message?.content);
  if (!parsed) throw new Error('extract: no JSON answer');
  return { entities: parsed.entities || [], claims: (parsed.claims || []).filter((c) => c?.subject && c?.claim) };
}

export function liveDeps(overrides = {}) {
  return { resolver, rdap, search, extract, memoryDir: process.env.INBOUND_MEMORY_DIR || null, ...overrides };
}
