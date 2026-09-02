// Does this address exist? Asked BEFORE anything else runs.
//
// John, 2026-09-02: "it should be before anything... we read it, check the site, and go
// 'that does not exist, did you mean something else, here is what could be close' — no
// reads, no searches, nothing."
//
// Reading a typo'd domain used to run the entire pipeline against a door that was not
// there: four corpus retrievals, a billed live-web search, a second research engine, an
// eleven-signal correlation, an infrastructure probe and an LLM write — then it asked the
// founder to confirm a product type for a company that does not exist. The identity gate
// stopped that becoming a false profile, but the cheapest and kindest answer was
// available in the first fifty milliseconds and nobody had asked for it.
//
// Deliberately uses ONLY DNS. No corpus, no research engine, no model. A suggestion is
// earned by a domain actually resolving, never by similarity alone — "did you mean X?"
// is worth saying only when X is real.

import { promises as dns } from 'node:dns';

const LOOKUP_TIMEOUT_MS = 2500;
const MAX_CANDIDATES = 24;

/** Raw DNS facts, or null when the lookup did not finish in time. */
async function dnsFacts(host, timeoutMs = LOOKUP_TIMEOUT_MS) {
  const ask = (fn) => fn(host).catch(() => []);
  const work = Promise.all([
    ask(dns.resolve4), ask(dns.resolveMx), ask(dns.resolveNs),
  ]).then(([a, mx, ns]) => ({ a, mx, ns }));
  const timeout = new Promise((r) => setTimeout(() => r(null), timeoutMs));
  return Promise.race([work, timeout]);
}

/**
 * Does the address the founder typed exist? FAILS OPEN.
 *
 * A timeout is not proof of absence, and wrongly telling someone their live site does
 * not exist is far worse than running the pipeline unnecessarily. So an inconclusive
 * lookup lets the read proceed.
 */
export async function domainResolves(domain) {
  if (!domain) return false;
  const host = String(domain).trim().replace(/^www\./, '');
  if (!host || !host.includes('.')) return false;
  const facts = await dnsFacts(host);
  if (facts === null) return true;                 // inconclusive → fail open
  return facts.a.length > 0 || facts.mx.length > 0;
}

/**
 * Is this candidate a REAL, delegated domain worth suggesting? FAILS CLOSED.
 *
 * The opposite posture to the check above, and the distinction matters: the first bug
 * here shared one 2.5s deadline across 24 parallel candidate lookups, so most timed out,
 * fell through the fail-open path, and were offered as suggestions — seven of them,
 * including ocngisys.co.uk, none of which exist at all. A suggestion must be EARNED by a
 * positive answer, never inherited from an inconclusive one.
 *
 * Requires an address AND delegation (NS) or mail (MX): a real business has somewhere to
 * send email and its own nameservers, which is most of what separates it from a parked
 * squat sitting on a wildcard.
 */
export async function domainIsReal(domain) {
  const facts = await dnsFacts(domain, LOOKUP_TIMEOUT_MS);
  if (!facts) return false;                        // inconclusive → fail closed
  return facts.a.length > 0 && (facts.mx.length > 0 || facts.ns.length > 0);
}

/** Split "congisys.co.uk" into ["congisys", "co.uk"]. */
export function splitDomain(domain) {
  const host = String(domain ?? '').trim().replace(/^www\./, '');
  const dot = host.indexOf('.');
  if (dot <= 0) return null;
  return { label: host.slice(0, dot), suffix: host.slice(dot + 1) };
}

/**
 * Single-edit neighbours of the label: transpositions, deletions, de-doubling.
 * Transposition is the one that matters most — it is the commonest human typo and it is
 * exactly how congisys/cognisys differ. Deliberately NOT substitutions: 25 per character
 * would mean hundreds of DNS lookups to catch a rarer mistake.
 */
export function nearbyLabels(label) {
  const l = String(label ?? '');
  const out = new Set();
  for (let i = 0; i < l.length - 1; i++) {
    out.add(l.slice(0, i) + l[i + 1] + l[i] + l.slice(i + 2));   // transpose
  }
  for (let i = 0; i < l.length; i++) {
    out.add(l.slice(0, i) + l.slice(i + 1));                     // delete
    if (l[i] === l[i + 1]) out.add(l.slice(0, i) + l.slice(i + 1)); // de-double
  }
  out.delete(l);
  return [...out].filter((c) => c.length >= 3).slice(0, MAX_CANDIDATES);
}

/**
 * Neighbours that are real. Transpositions are offered before deletions: transposing is
 * the commonest typo and preserves length, so it is the likelier intent.
 */
export async function nearbyDomains(domain, { limit = 3 } = {}) {
  const parts = splitDomain(domain);
  if (!parts) return [];
  const labels = nearbyLabels(parts.label);
  const checked = await Promise.all(labels.map(async (l) => {
    const candidate = `${l}.${parts.suffix}`;
    return (await domainIsReal(candidate)) ? candidate : null;
  }));
  return checked.filter(Boolean).slice(0, limit);
}

/**
 * The door check. { exists: true } → run the pipeline as normal.
 * { exists: false, suggestions } → stop, ask, spend nothing.
 */
export async function preflight(domain) {
  if (!domain) return { exists: true, suggestions: [] };     // nothing to check — fail open
  if (await domainResolves(domain)) return { exists: true, suggestions: [] };
  return { exists: false, suggestions: await nearbyDomains(domain) };
}
