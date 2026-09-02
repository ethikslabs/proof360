// Identity resolution — ONE answer to "is this material actually about the company
// being read?", computed once, upstream, and read by every consumer.
//
// Why this file exists (John, 2026-09-02, second pass). The gate shipped inside
// cold-reading.js and it worked: a read on congisys.co.uk correctly refused to write
// a profile out of Cognisys holdings. But it gated ONE stream. Three other surfaces
// consumed the same untagged hits and said what the prose had just refused to say —
// the "Before we read your site" panel asserted the holdings were about Congisys, the
// observation strip published twelve signals extracted from them, and every advisor
// answer downstream reasoned from them. The material was contaminated at the source;
// gating the one stream I happened to be looking at left the other three open.
//
// So identity is resolved HERE, once, and stamped onto each holding. Consumers read
// the stamp. Adding a new consumer cannot reopen the hole, because the hole is closed
// where the hits are born rather than where they are used.

/** lowercase, letters+digits only — so "Cognisys Ltd." and "cognisys" compare equal. */
export function normaliseName(name) {
  return String(name ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function domainOf(session) {
  const url = session?.website_url;
  if (!url) return null;
  try {
    const u = url.startsWith('http') ? url : `https://${url}`;
    return new URL(u).hostname;
  } catch {
    return url;
  }
}

/**
 * Is this holding actually ABOUT the company being read?
 *
 * Corpus retrieval is semantic and should stay that way — finding near material is
 * the point. The bug was consuming every hit as testimony about them. A holding earns
 * 'confirmed' only on a hard identity link: it is published on their own domain, or it
 * names them in its text or slug. Anything else is 'unconfirmed' — kept, shown, cited,
 * but never spoken in the second person and never turned into a signal.
 *
 * Fails CLOSED: no company name and no domain to check against means unconfirmed.
 */
export function holdingIdentity(hit, { company_name, domain } = {}) {
  const name = normaliseName(company_name);
  const host = normaliseName(String(domain ?? '').replace(/^www\./, '').split('.')[0]);
  const candidates = [name, host].filter((c) => c.length >= 4);
  if (!candidates.length) return 'unconfirmed';

  if (hit?.source_url && domain) {
    try {
      const h = new URL(hit.source_url).hostname.replace(/^www\./, '');
      const d = String(domain).replace(/^www\./, '');
      if (h === d || h.endsWith(`.${d}`)) return 'confirmed';
    } catch { /* malformed URL — fall through to the text checks */ }
  }

  const haystack = normaliseName(`${hit?.text ?? ''} ${hit?.slug ?? ''}`);
  return candidates.some((c) => haystack.includes(c)) ? 'confirmed' : 'unconfirmed';
}

/**
 * Resolve the session's identity verdict and STAMP each holding with its own.
 *
 * Mutates the hits in place on purpose: `session.corpus_hits` is the single array
 * every consumer receives, so stamping it is what makes the gate travel. A consumer
 * that never heard of this module still gets tagged material.
 *
 * Returns the session-level verdict. Reading their own pages IS an identity link —
 * you cannot fetch the wrong company's website — so pages_read_count > 0 confirms.
 * The live-web summary is checked the same way as a holding: asked to research the
 * company at a typo'd domain, an engine will silently correct the typo and answer
 * about a different company, and that answer is not corpus so the holding stamp
 * never sees it.
 */
export function resolveSessionIdentity({
  company_name, website_url, hits, pages_read_count = 0, company_summary = null,
} = {}) {
  const domain = domainOf({ website_url });
  const ctx = { company_name, domain };

  let any_confirmed = false;
  if (Array.isArray(hits)) {
    for (const hit of hits) {
      if (!hit || typeof hit !== 'object') continue;
      hit.identity = holdingIdentity(hit, ctx);
      if (hit.identity === 'confirmed') any_confirmed = true;
    }
  }

  const summary_confirmed = !!company_summary
    && holdingIdentity({ text: company_summary }, ctx) === 'confirmed';

  const pages = Number(pages_read_count) || 0;

  return {
    domain,
    any_confirmed,
    summary_confirmed,
    pages_read: pages,
    confirmed: pages > 0 || any_confirmed || summary_confirmed,
  };
}

/** Holdings we may speak from. An UNSTAMPED hit has had no resolution run — see below. */
export function confirmedHoldings(hits) {
  if (!Array.isArray(hits)) return hits;
  // Filters on the explicit stamp rather than recomputing, so there is exactly one
  // place identity is decided. An unstamped hit passes: that state only exists in
  // unit fixtures and in sessions recorded before this module, and silently dropping
  // real material because a stamp is missing would be its own honesty failure. The
  // pipeline is closed at session-start, which always stamps.
  return hits.filter((h) => h?.identity !== 'unconfirmed');
}
