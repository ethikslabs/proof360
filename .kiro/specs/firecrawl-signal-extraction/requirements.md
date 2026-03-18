# Requirements Document

## Introduction

Proof360 currently uses a hardcoded MVP simulation in signal-extractor.js that returns identical B2B SaaS signals for every website URL regardless of actual content. This spec replaces that simulation with real website scraping via the Firecrawl SDK (@mendable/firecrawl-js). The new pipeline scrapes a founder's actual website, discovers priority pages via site map, extracts structured signals from real content, and feeds genuine company-specific data into the cold read pipeline.

Signal extraction is the entry point of the entire Proof360 pipeline. Every downstream service (inference builder, gap mapper, vendor selector, report generator) consumes the output of signal extraction. Replacing simulation with real extraction is the single highest-impact improvement to product quality.

The integration uses firecrawl_scrape for page content retrieval and firecrawl_extract for structured signal extraction from combined content. A strict fallback chain ensures the pipeline never blocks: if Firecrawl is unavailable, the system falls back to the existing MVP simulation.

## Glossary

- **Signal_Extractor**: The service (signal-extractor.js) that accepts a website_url or deck_file and returns structured signals, sources_read, enterprise_signals, and competitor_mentions for downstream consumption
- **Firecrawl_Client**: The @mendable/firecrawl-js SDK instance used to scrape pages, discover site maps, and extract structured data from website content
- **Site_Map**: The list of URLs discovered via Firecrawl's mapUrl() method, used to determine which priority pages exist on a founder's website
- **Priority_Pages**: The set of pages targeted for scraping: / (homepage), /security, /trust, /compliance, /pricing, /about
- **Extraction_Prompt**: The structured prompt sent to Firecrawl's extract endpoint that defines the JSON schema for signal extraction from combined page content
- **Structured_Signals**: The JSON object returned by Firecrawl extraction containing: company_name, product_type, customer_type, data_sensitivity, infrastructure, stage, primary_use_case, enterprise_signals, competitor_mentions, and confidence_notes
- **Enterprise_Signals**: A sub-object tracking presence of security_page_detected, trust_centre_detected, soc2_mentioned, and pricing_enterprise_tier on the scraped website
- **Combined_Content**: The assembled text sent to the extraction endpoint, composed of footer signals, page headings, and page content sections (in that order), capped at 40,000 characters
- **Footer_Signals**: Plain text extracted from HTML `<footer>` elements of scraped pages, containing high-value signals (compliance badges, partner logos, certifications) that are often absent from markdown body content
- **Page_Headings**: H1 and H2 headings extracted from HTML of scraped pages, providing the clearest product type and positioning signals
- **MVP_Simulation**: The existing hardcoded signal extraction in signal-extractor.js that returns identical signals for every URL, used as the fallback when Firecrawl is unavailable
- **Cold_Read_Pipeline**: The downstream chain that consumes signal extraction output: inference builder → context normalizer → gap mapper → vendor selector → report
- **Scrape_Budget**: The cost constraint limiting scraping to the homepage plus a maximum of 4 additional priority pages per session (~10 credits per session, ~50 sessions/month on the free tier)

## Requirements

### Requirement 1: Firecrawl Client Initialisation

**User Story:** As a developer, I want the Firecrawl SDK initialised with proper configuration, so that the signal extractor can make authenticated API calls to Firecrawl.

#### Acceptance Criteria

1. WHEN the Signal_Extractor module loads, THE Signal_Extractor SHALL initialise the Firecrawl_Client using the FIRECRAWL_API_KEY environment variable
2. IF the FIRECRAWL_API_KEY environment variable is not set, THEN THE Signal_Extractor SHALL log a warning and operate in simulation-only mode using the MVP_Simulation
3. THE Signal_Extractor SHALL use the @mendable/firecrawl-js SDK installed in the api/ package directory

### Requirement 2: Domain Normalisation and Site Map Discovery

**User Story:** As a system operator, I want the extractor to normalise user-provided URLs and discover which priority pages exist on a founder's website, so that scraping targets real pages and avoids 404 errors or duplicate scrapes.

#### Acceptance Criteria

1. WHEN a website_url is provided, THE Signal_Extractor SHALL normalise the URL before any Firecrawl calls by: adding https:// if no protocol is present, stripping www. prefix, removing trailing slashes, and stripping query parameters and hash fragments
2. THE Signal_Extractor SHALL call Firecrawl_Client mapUrl() using the normalised URL to discover available pages on the target domain
2. THE Signal_Extractor SHALL match discovered URLs against the Priority_Pages list (/, /security, /trust, /compliance, /pricing, /about) to determine which pages to scrape
3. THE Signal_Extractor SHALL select the homepage plus a maximum of 4 additional pages from the Priority_Pages list that exist in the Site_Map, respecting the Scrape_Budget
4. IF the Site_Map discovery call fails, THEN THE Signal_Extractor SHALL fall back to scraping only the homepage URL

### Requirement 3: Parallel Page Scraping

**User Story:** As a founder, I want the system to read my actual website pages quickly, so that the trust assessment reflects my real company and completes within the cold read animation window.

#### Acceptance Criteria

1. WHEN priority pages have been identified, THE Signal_Extractor SHALL scrape all selected pages in parallel using Promise.allSettled(), not sequentially
2. THE Signal_Extractor SHALL enforce a 15-second timeout per individual page scrape using Promise.race()
3. IF an individual page scrape fails or times out, THEN THE Signal_Extractor SHALL skip that page and process results from remaining pages
4. THE Signal_Extractor SHALL record each successfully scraped page path in the sources_read array
5. THE Signal_Extractor SHALL request both markdown and html formats from Firecrawl scrape calls, as html is required for footer and heading extraction
6. THE Signal_Extractor SHALL collect raw HTML content alongside markdown content for each successfully scraped page

### Requirement 4: Footer and Heading Intelligence with Structured Signal Extraction

**User Story:** As a system operator, I want high-value signals from footers and headings prioritised in the extraction input, so that the extraction model sees compliance badges, partner logos, and clear product positioning before marketing copy.

#### Acceptance Criteria

1. THE Signal_Extractor SHALL extract footer content from raw HTML of each scraped page by matching `<footer>` elements, falling back to the last 1000 characters of body content if no footer tag is found
2. THE Signal_Extractor SHALL extract H1 and H2 headings from raw HTML of each scraped page, limited to the top 20 headings
3. THE Signal_Extractor SHALL assemble Combined_Content by prepending footer signals and page headings before page markdown content, in the order: footer signals section, page headings section, page content section
4. THE Combined_Content SHALL be capped at 40,000 characters after assembly
5. WHEN Combined_Content is available, THE Signal_Extractor SHALL call Firecrawl_Client extract with the Combined_Content and the Extraction_Prompt to produce Structured_Signals
6. The Extraction_Prompt SHALL request a JSON object containing: company_name, product_type, customer_type, data_sensitivity, infrastructure, stage, primary_use_case, enterprise_signals (security_page_detected, trust_centre_detected, soc2_mentioned, pricing_enterprise_tier), competitor_mentions, and confidence_notes
7. THE Signal_Extractor SHALL map each field in Structured_Signals to the existing signal array format with type, value, and confidence fields
8. THE Signal_Extractor SHALL derive confidence levels from the confidence_notes returned by the extraction: direct statements map to "confident", strong implications map to "likely", and weak implications map to "probable"
9. IF the extract call fails, THEN THE Signal_Extractor SHALL parse the raw Combined_Content to build minimal signals using keyword matching as a degraded fallback

### Requirement 5: Enterprise Signal Detection

**User Story:** As a system operator, I want enterprise readiness signals detected from real website content, so that the dataset captures genuine trust maturity indicators.

#### Acceptance Criteria

1. WHEN a /security or /trust page is successfully scraped, THE Signal_Extractor SHALL set security_page_detected to true in the enterprise_signals object
2. WHEN scraped content contains references to a trust centre or trust center, THE Signal_Extractor SHALL set trust_centre_detected to true
3. WHEN scraped content contains references to SOC 2 or SOC2 certification, THE Signal_Extractor SHALL set soc2_mentioned to true
4. WHEN a /pricing page is scraped and contains an enterprise tier reference, THE Signal_Extractor SHALL set pricing_enterprise_tier to true
5. THE Signal_Extractor SHALL initialise all enterprise_signals fields to false and only set them to true based on evidence from scraped content

### Requirement 6: Competitor Mention Extraction

**User Story:** As a system operator, I want competitor mentions detected from website content, so that the dataset captures competitive positioning signals.

#### Acceptance Criteria

1. WHEN Structured_Signals contains a non-empty competitor_mentions array, THE Signal_Extractor SHALL include those mentions in the extraction result
2. Each competitor mention SHALL be a string identifying the competitor name as found in the website content
3. IF no competitor mentions are detected, THE Signal_Extractor SHALL return an empty competitor_mentions array

### Requirement 7: Graceful Fallback to MVP Simulation

**User Story:** As a founder, I want the trust assessment to complete even when website scraping is unavailable, so that the pipeline never blocks my experience.

#### Acceptance Criteria

1. IF the Firecrawl_Client is not initialised (missing API key), THEN THE Signal_Extractor SHALL execute the MVP_Simulation and return hardcoded signals
2. IF all page scrapes fail and no Combined_Content is available, THEN THE Signal_Extractor SHALL fall back to the MVP_Simulation
3. WHEN falling back to MVP_Simulation, THE Signal_Extractor SHALL log a structured warning containing the session context and the reason for fallback
4. THE Signal_Extractor SHALL include a metadata field indicating whether the extraction used "firecrawl" or "simulation" as the source
5. THE Signal_Extractor SHALL complete the full extraction pipeline (including fallback) without blocking the Cold_Read_Pipeline

### Requirement 8: Output Shape Compatibility

**User Story:** As a developer, I want the new extraction output to match the existing signal shape, so that downstream services (inference builder, gap mapper, vendor selector) require no changes.

#### Acceptance Criteria

1. THE Signal_Extractor SHALL return an object containing: signals (array of { type, value, confidence }), sources_read (array of strings), enterprise_signals (object matching ENTERPRISE_SIGNALS_SCHEMA), and competitor_mentions (array of strings)
2. THE Signal_Extractor SHALL support the same signal types consumed by the Inference_Builder: product_type, customer_type, data_sensitivity, infrastructure, stage, and use_case
3. WHEN a company_name is extracted from website content, THE Signal_Extractor SHALL include it as a signal with type "company_name"
4. THE Signal_Extractor SHALL preserve the existing async function signature: extractSignals({ website_url, deck_file }) returning a Promise

### Requirement 9: Cost and Rate Management

**User Story:** As a system operator, I want scraping costs bounded per session, so that the free tier budget of 500 credits per month supports approximately 50 sessions.

#### Acceptance Criteria

1. THE Signal_Extractor SHALL scrape a maximum of 5 pages per session (homepage plus up to 4 additional Priority_Pages)
2. THE Signal_Extractor SHALL not retry failed page scrapes to conserve credits
3. THE Signal_Extractor SHALL log the number of pages scraped and credits consumed per extraction session as structured JSON

### Requirement 10: Timeout and Non-Blocking Behaviour

**User Story:** As a founder, I want the extraction to complete within a reasonable time, so that the cold read experience remains responsive.

#### Acceptance Criteria

1. THE Signal_Extractor SHALL enforce a 15-second timeout on each individual Firecrawl scrape call
2. THE Signal_Extractor SHALL skip any page that exceeds the timeout and continue with remaining pages
3. THE Signal_Extractor SHALL complete the entire extraction pipeline (site map discovery, scraping, extraction, fallback) without blocking the session start HTTP response
4. IF the total extraction time exceeds 60 seconds, THEN THE Signal_Extractor SHALL abort remaining operations and proceed with whatever content has been collected

### Requirement 11: Structured Logging

**User Story:** As a developer, I want structured log output from the extraction pipeline, so that I can diagnose scraping failures and monitor extraction quality.

#### Acceptance Criteria

1. THE Signal_Extractor SHALL log a structured JSON entry at the start of extraction containing: event name, website_url, and timestamp
2. THE Signal_Extractor SHALL log a structured JSON entry on completion containing: event name, pages_attempted, pages_scraped, signals_extracted, extraction_source ("firecrawl" or "simulation"), and duration_ms
3. WHEN a page scrape fails or times out, THE Signal_Extractor SHALL log a structured JSON warning containing: event name, page_url, error message, and duration_ms
4. WHEN falling back to simulation, THE Signal_Extractor SHALL log a structured JSON warning containing: event name, reason, and website_url

### Requirement 12: Package and Environment Configuration

**User Story:** As a developer, I want the Firecrawl SDK dependency and environment variable documented and installed, so that the integration can be deployed and configured.

#### Acceptance Criteria

1. THE api/package.json SHALL include @mendable/firecrawl-js as a dependency
2. THE Signal_Extractor SHALL read the FIRECRAWL_API_KEY from process.env
3. IF FIRECRAWL_API_KEY is not set in the environment, THEN THE Signal_Extractor SHALL operate without error using the MVP_Simulation fallback

### Requirement 13: Extraction Prompt Schema

**User Story:** As a system operator, I want the extraction prompt to define a precise JSON schema, so that Firecrawl returns consistently structured signals across different websites.

#### Acceptance Criteria

1. THE Extraction_Prompt SHALL define a JSON schema specifying: company_name (string), product_type (string), customer_type (string), data_sensitivity (string), infrastructure (string), stage (string), primary_use_case (string), enterprise_signals (object with boolean fields), competitor_mentions (array of strings), and confidence_notes (object mapping field names to confidence reasoning)
2. THE Extraction_Prompt SHALL instruct the extraction model to return null for fields where no evidence exists in the content rather than guessing
3. THE Signal_Extractor SHALL treat null extraction fields as absent signals rather than generating low-confidence guesses
