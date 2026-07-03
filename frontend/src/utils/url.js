// URL extraction for chat messages — pure functions, no React, no network.
// Two deliberately different strictness levels:
//   extractUrl        — the general message detector (moved verbatim from Chat.jsx).
//                       Narrow on purpose: a message that merely mentions a domain
//                       mid-sentence must NOT trigger a cold-read.
//   extractAwaitedUrl — used ONLY when a lens has asked for a missing field and this
//                       message is the reply. Here "we're at northwind.io" is a
//                       website answer, so schemeless embedded domains count.

// Returns a normalised https:// URL if the message looks like a domain/URL, else null.
// Matches: "example.com", "https://example.com", "go to https://acme.io", etc.
export function extractUrl(text) {
  const t = text.trim();
  // Bare domain or full URL with no spaces
  if (!t.includes(' ')) {
    if (/^https?:\/\//i.test(t)) return t;
    if (/^[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+/.test(t)) return `https://${t}`;
  }
  // URL embedded in longer text
  const match = t.match(/https?:\/\/[^\s]+/i);
  if (match) return match[0];
  return null;
}

// Broader matcher for awaited replies: everything extractUrl accepts, plus a schemeless
// domain embedded in a sentence. The domain must sit on its own word boundary and end in
// an alphabetic TLD (2+ chars), so "Pty. Ltd", "v2.0" and "Series A." never match, and
// trailing punctuation ("…acme.com.au, have a look") is not swallowed.
export function extractAwaitedUrl(text) {
  const direct = extractUrl(String(text || ''));
  if (direct) return direct;
  const m = String(text || '').match(/(?:^|[\s(])((?:[a-z0-9][a-z0-9-]*\.)+[a-z]{2,})(?=[\s).,!?;:]|$)/i);
  return m ? `https://${m[1]}` : null;
}
