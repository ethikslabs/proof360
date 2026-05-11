# Proof360 — Firecrawl Integration Addendum
# Three improvements to the requirements doc before build

## Addendum to Requirement 3: Parallel scraping (replaces sequential)

**Change:** Scrape all priority pages in parallel using `Promise.allSettled()`, not sequentially.

**Why:** Sequential scraping of 5 pages at 15s timeout each = up to 75s worst case. Parallel = 15s worst case. The cold read animation runs while extraction happens — 15s is acceptable, 75s is not.

**Implementation:**

```js
const scrapeResults = await Promise.allSettled(
  targetUrls.map(url =>
    Promise.race([
      client.scrapeUrl(url, { formats: ['markdown', 'html'], onlyMainContent: false }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000))
    ])
  )
);

for (let i = 0; i < scrapeResults.length; i++) {
  const result = scrapeResults[i];
  if (result.status === 'fulfilled' && result.value?.markdown) {
    raw_content.push(result.value.markdown);
    raw_html.push(result.value.html || '');
    sources_read.push(urlToLabel(targetUrls[i]));
  } else {
    logger.warn({ url: targetUrls[i], reason: result.reason?.message }, 'page scrape skipped');
  }
}
```

Note: Request `html` format in addition to `markdown` — needed for footer/heading extraction below.

---

## Addendum to Requirement 4: Footer and heading intelligence (new pre-processing step)

**Add before structured extraction:** Extract footer content and H1/H2 headings from raw HTML, then prepend them to `Combined_Content`.

**Why:** Marketing copy on homepages is vague. Footers contain hard signals: "SOC 2 Type II certified", "AWS Partner", "ISO 27001". H1/H2 headings contain the clearest product type signal. Prepending these means the extraction model sees the most reliable signals first.

**Implementation:**

```js
function extractFooterContent(html) {
  if (!html) return '';
  const footerMatch = html.match(/<footer[^>]*>([\s\S]*?)<\/footer>/i);
  if (footerMatch) {
    return footerMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 2000);
  }
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(-1000);
}

function extractHeadings(html) {
  if (!html) return '';
  const headings = [];
  const h1matches = html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi);
  const h2matches = html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi);
  for (const m of h1matches) headings.push('H1: ' + m[1].replace(/<[^>]+>/g, '').trim());
  for (const m of h2matches) headings.push('H2: ' + m[1].replace(/<[^>]+>/g, '').trim());
  return headings.slice(0, 20).join('\n');
}

const footerContent = raw_html.map(extractFooterContent).filter(Boolean).join('\n\n');
const headingContent = raw_html.map(extractHeadings).filter(Boolean).join('\n\n');

const combined = [
  footerContent ? `=== FOOTER SIGNALS ===\n${footerContent}` : '',
  headingContent ? `=== PAGE HEADINGS ===\n${headingContent}` : '',
  `=== PAGE CONTENT ===\n${raw_content.join('\n\n---\n\n')}`,
].filter(Boolean).join('\n\n').slice(0, 40000);
```

**What this catches that plain markdown misses:**
- `SOC 2 Type II certified` — footer badges
- `AWS Partner Network` — footer logo alt text
- `ISO 27001` — footer compliance section
- `Trusted by Stripe, Shopify, Atlassian` — footer social proof
- `Enterprise AI Compliance Platform` — H1 on homepage

---

## Addendum to Requirement 2: Domain normalisation

**Add as first step before any Firecrawl calls.**

```js
function normaliseUrl(rawUrl) {
  let url = rawUrl.trim().toLowerCase();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  try {
    const parsed = new URL(url);
    parsed.hostname = parsed.hostname.replace(/^www\./, '');
    parsed.pathname = parsed.pathname.replace(/\/$/, '') || '/';
    parsed.search = '';
    parsed.hash = '';
    return parsed.origin;
  } catch {
    return url.startsWith('http') ? url : 'https://' + url;
  }
}
const baseUrl = normaliseUrl(website_url);
```

---

## Summary

| Req | Change |
|-----|--------|
| Req 2 | Add domain normalisation before mapUrl call |
| Req 3 | Parallel scraping with Promise.allSettled(). Request html + markdown formats. |
| Req 4 | Footer + heading extraction prepended to Combined_Content before extraction call. |

All other requirements (1, 5–13) stand unchanged.

---

## Expected improvement in signal quality

| Signal | Before | After |
|--------|--------|-------|
| infrastructure | often null | AWS/GCP/Azure from footer badges |
| soc2_mentioned | misses footer badges | catches SOC 2 Type II in footer |
| product_type | vague marketing copy | clear from H1 heading |
| trust_centre_detected | misses footer links | catches Trust Center footer link |

Same scrape budget. Same API cost. Meaningfully better signal quality.
