/**
 * Pure helpers for constructing and parsing shareable cold-read URLs.
 * Extracted to a plain JS module so property tests can import without JSX parsing.
 */

/**
 * Build a shareable cold-read URL from a session ID and original URL.
 * Returns a relative path: /audit/cold-read?session=<id>&url=<encoded>
 */
export function buildShareableUrl(sessionId, originalUrl) {
  return `/audit/cold-read?session=${encodeURIComponent(sessionId)}&url=${encodeURIComponent(originalUrl)}`;
}

/**
 * Parse a shareable URL string back into { session, url }.
 * Accepts both relative paths and full URLs.
 */
export function parseShareableUrl(shareableUrl) {
  // Handle relative paths by giving them a dummy base
  const parsed = new URL(shareableUrl, 'https://placeholder.local');
  return {
    session: parsed.searchParams.get('session'),
    url: parsed.searchParams.get('url'),
  };
}
