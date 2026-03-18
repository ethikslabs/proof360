# Implementation Plan: Firecrawl Signal Extraction

## Overview

Rewrite `api/src/services/signal-extractor.js` from hardcoded MVP simulation to a real Firecrawl-powered extraction pipeline. The implementation follows the 7-step pipeline (Init → Normalise → Map → Scrape → Pre-process → Extract → Map to signals) with a strict fallback chain. Single-file rewrite plus one dependency addition — no downstream changes.

## Tasks

- [ ] 1. Add Firecrawl SDK dependency and set up module scaffolding
  - [ ] 1.1 Add `@mendable/firecrawl-js` to `api/package.json` dependencies
    - Add the dependency entry to the dependencies object
    - _Requirements: 12.1_
  - [ ] 1.2 Scaffold the new `signal-extractor.js` with imports, constants, and client initialisation
    - Import `FirecrawlApp` from `@mendable/firecrawl-js` and `ENTERPRISE_SIGNALS_SCHEMA` from `../config/gaps.js`
    - Define `FIRECRAWL_API_KEY` from `process.env`, `PRIORITY_PATHS`, `MAX_PAGES`, `PAGE_TIMEOUT_MS`, `PIPELINE_TIMEOUT_MS`
    - Initialise `firecrawlClient` at module level; log structured warning if API key missing
    - Define `EXTRACTION_SCHEMA` object and extraction prompt string
    - Preserve the existing `extractSignals({ website_url, deck_file })` export signature
    - Keep the existing MVP simulation logic as `runSimulation()` internal function
    - _Requirements: 1.1, 1.2, 1.3, 12.2, 12.3, 13.1, 13.2_

- [ ] 2. Implement domain normalisation and site map discovery
  - [ ] 2.1 Implement `normaliseUrl(rawUrl)` function
    - Add `https://` if no protocol, strip `www.`, remove trailing slash, strip query params and hash
    - Use `new URL()` for parsing with try/catch fallback
    - _Requirements: 2.1_
  - [ ]* 2.2 Write property test for `normaliseUrl` (Property 2)
    - **Property 2: Domain normalisation produces consistent URLs**
    - Generate random URL strings with/without protocol, www, trailing slash, query, hash using fast-check
    - Assert output starts with `https://`, has no `www.`, no trailing slash, no query/hash
    - **Validates: Requirements 2.1**
  - [ ] 2.3 Implement `discoverPages(client, url)` and `selectPriorityPages(siteMapUrls, baseUrl)` functions
    - Call `client.mapUrl()` with normalised URL
    - Match discovered URLs against `PRIORITY_PATHS`
    - Always include homepage, fill remaining slots from priority list, cap at `MAX_PAGES`
    - If `mapUrl()` fails, return homepage-only array
    - _Requirements: 2.2, 2.3, 2.4, 2.5_
  - [ ]* 2.4 Write property test for page selection (Property 3)
    - **Property 3: Page selection respects priority list and budget**
    - Generate random sets of URLs as site maps; verify homepage always included, all selected paths in priority list, total ≤ 5, non-homepage pages exist in site map
    - **Validates: Requirements 2.3, 2.4, 9.1**

- [ ] 3. Implement parallel page scraping
  - [ ] 3.1 Implement `scrapePages(client, urls)` function
    - Scrape all URLs in parallel using `Promise.allSettled()` with `Promise.race()` for 15s per-page timeout
    - Request both `markdown` and `html` formats from Firecrawl
    - Collect `{ path, url, content, html, title }` for each successful scrape
    - Skip failed/timed-out pages, log structured warnings
    - Record successfully scraped page paths for `sources_read`
    - No retries on failure
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 9.2, 10.1, 10.2_
  - [ ]* 3.2 Write property test for parallel scrape resilience (Property 4)
    - **Property 4: Parallel scrapes complete within timeout bounds**
    - Generate random page lists with random failure patterns; verify pipeline completes with successful pages only
    - **Validates: Requirements 3.1, 3.3, 10.2**
  - [ ]* 3.3 Write property test for sources_read correctness (Property 5)
    - **Property 5: Sources read matches successfully scraped pages**
    - Generate random scraped page objects; verify sources_read contains exactly the successful page paths
    - **Validates: Requirements 3.4**

- [ ] 4. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement footer/heading extraction and content assembly
  - [ ] 5.1 Implement `extractFooterContent(html)` function
    - Match `<footer>` elements from raw HTML, strip tags, limit to 2000 chars
    - Fall back to last 1000 characters of body content if no footer tag found
    - _Requirements: 4.1_
  - [ ] 5.2 Implement `extractHeadings(html)` function
    - Extract H1 and H2 headings from raw HTML via regex
    - Prefix with `H1:` / `H2:`, limit to top 20 headings
    - _Requirements: 4.2_
  - [ ] 5.3 Implement `combineContent(pages)` function
    - Assemble combined content in order: footer signals section → page headings section → page content section
    - Iterate all pages, extract footers and headings from HTML, collect markdown content
    - Cap combined string at 40,000 characters
    - _Requirements: 4.3, 4.4_
  - [ ]* 5.4 Write property test for content assembly (Property 6)
    - **Property 6: Combined content includes footer and heading sections and respects cap**
    - Generate random page contents and HTML of varying sizes; verify section ordering, footer/heading inclusion, and 40k cap
    - **Validates: Requirements 3.5, 4.1, 4.2, 4.3, 4.4**

- [ ] 6. Implement structured extraction and signal mapping
  - [ ] 6.1 Implement `extractStructured(client, content)` function
    - Call `client.extract()` with combined content and `EXTRACTION_SCHEMA`
    - Handle extract failure by falling back to `keywordFallback(content)`
    - _Requirements: 4.5, 4.6, 4.9_
  - [ ] 6.2 Implement `mapToSignals(extracted)` and `deriveConfidence(note)` functions
    - Map each non-null extraction field to `{ type, value, confidence }` signal
    - Map `primary_use_case` to signal type `use_case`, `company_name` to type `company_name`
    - Derive confidence: "direct" → `confident`, "strong" → `likely`, else → `probable`
    - Null fields produce no signal
    - _Requirements: 4.7, 4.8, 8.2, 8.3, 13.3_
  - [ ]* 6.3 Write property test for signal mapping (Property 7)
    - **Property 7: Signal mapping completeness and null exclusion**
    - Generate random extraction results with random null/non-null fields; verify one signal per non-null field, no signal for null fields
    - **Validates: Requirements 4.7, 8.3, 13.3**
  - [ ]* 6.4 Write property test for confidence derivation (Property 8)
    - **Property 8: Confidence derivation follows the mapping rules**
    - Generate random strings including "direct", "strong", neither, and null; verify correct confidence output
    - **Validates: Requirements 4.8**
  - [ ] 6.5 Implement `keywordFallback(content)` function
    - Scan combined content for keywords: SaaS, API, enterprise, AWS, GCP, Azure
    - Return array of `{ type, value, confidence: 'probable' }` signals
    - _Requirements: 4.9_

- [ ] 7. Implement enterprise signal detection and competitor mentions
  - [ ] 7.1 Implement `detectEnterpriseSignals(scrapedPages, extractedSignals)` function
    - Initialise all fields to false
    - Set `security_page_detected` true if /security or /trust page scraped
    - Set `trust_centre_detected` true if content contains "trust centre" or "trust center"
    - Set `soc2_mentioned` true if content contains "SOC 2" or "SOC2"
    - Set `pricing_enterprise_tier` true if /pricing page scraped and contains enterprise tier reference
    - Merge with extraction result enterprise_signals (extraction takes precedence for content-based signals)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  - [ ]* 7.2 Write property test for enterprise signals (Property 9)
    - **Property 9: Enterprise signals reflect scraped content evidence**
    - Generate random page sets with random content containing/not containing keywords; verify each boolean field matches evidence
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**
  - [ ] 7.3 Wire competitor mentions pass-through
    - Pass `competitor_mentions` from extraction result to output; default to empty array
    - _Requirements: 6.1, 6.2, 6.3_
  - [ ]* 7.4 Write property test for competitor mentions (Property 10)
    - **Property 10: Competitor mentions pass through faithfully**
    - Generate random extraction results with varying competitor_mentions arrays; verify exact pass-through
    - **Validates: Requirements 6.1, 6.2, 6.3**

- [ ] 8. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Wire the main pipeline with fallback chain and logging
  - [ ] 9.1 Implement the main `extractSignals()` pipeline orchestration
    - Wire the 7-step pipeline: init check → normalise → map → scrape → pre-process → extract → map to signals
    - Implement fallback chain: no API key → simulation; map fails → homepage only; all scrapes fail → simulation; extract fails → keyword fallback
    - Enforce 60s total pipeline timeout using `Promise.race()`; abort remaining ops and proceed with collected content
    - Set `extraction_source` metadata field to `"firecrawl"` or `"simulation"`
    - _Requirements: 7.1, 7.2, 7.4, 7.5, 8.1, 8.4, 10.3, 10.4_
  - [ ] 9.2 Add structured logging throughout the pipeline
    - Log `extraction_start` event with `website_url` and `timestamp` at pipeline start
    - Log `extraction_complete` event with `pages_attempted`, `pages_scraped`, `signals_extracted`, `extraction_source`, `duration_ms` on completion
    - Log `page_scrape_failed` warning with `page_url`, `error`, `duration_ms` on scrape failure
    - Log `extraction_fallback` warning with `reason` and `website_url` on simulation fallback
    - Log pages scraped and credits consumed per session
    - _Requirements: 9.3, 11.1, 11.2, 11.3, 11.4_
  - [ ]* 9.3 Write property test for simulation fallback (Property 1)
    - **Property 1: Missing API key forces simulation mode**
    - Generate random website URLs; run with no API key; verify `extraction_source` is `"simulation"` and signals match MVP simulation
    - **Validates: Requirements 1.2, 7.1, 12.3**
  - [ ]* 9.4 Write property test for output shape invariant (Property 11)
    - **Property 11: Output shape invariant**
    - Generate random inputs (URL/deck combinations); verify output contains `signals` array with valid types, `sources_read` string array, `enterprise_signals` with four boolean fields, `competitor_mentions` string array, `extraction_source` as `"firecrawl"` or `"simulation"`
    - **Validates: Requirements 7.4, 8.1, 8.2**

- [ ] 10. Unit tests for integration points and edge cases
  - [ ]* 10.1 Write unit tests for fallback scenarios and edge cases
    - Test: missing API key returns simulation result (Req 1.2, 7.1)
    - Test: `mapUrl()` failure falls back to homepage-only scrape (Req 2.5)
    - Test: `extract()` failure triggers keyword fallback (Req 4.9)
    - Test: all scrapes fail returns simulation result (Req 7.2)
    - Test: empty competitor mentions returns `[]` not `null` (Req 6.3)
    - Test: 60s pipeline timeout aborts and returns partial results (Req 10.4)
    - Test: failed scrapes are not retried (Req 9.2)
    - _Requirements: 1.2, 2.5, 4.9, 6.3, 7.1, 7.2, 9.2, 10.4_
  - [ ]* 10.2 Write unit tests for logging and schema validation
    - Test: structured log emitted on extraction start and completion (Req 11.1, 11.2)
    - Test: structured warning logged on scrape failure (Req 11.3)
    - Test: structured warning logged on fallback (Req 7.3, 11.4)
    - Test: `EXTRACTION_SCHEMA` contains all required fields (Req 13.1)
    - Test: extraction prompt instructs null for missing evidence (Req 13.2)
    - _Requirements: 7.3, 11.1, 11.2, 11.3, 11.4, 13.1, 13.2_

- [ ] 11. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests use `fast-check` and validate universal correctness properties from the design document
- All Firecrawl SDK calls are mocked in tests — no real API calls during testing
- Checkpoints ensure incremental validation at natural breakpoints
- The single-file rewrite preserves the existing export signature so no downstream changes are needed
