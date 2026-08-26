// Why a cold read failed, in the founder's language.
//
// The catch around the cold-read pipeline was `} catch {` — the error object was
// discarded before anyone could look at it, and every one of the three possible
// failures rendered the same dead end: "Couldn't read X. Check the URL or try a
// different one." That sentence is wrong twice over. It blames the URL, which is
// usually fine, and it tells the one person who could act on the real reason
// nothing at all. John hit it three times on 2026-08-26 — a fresh tab, then an
// incognito window — and asked, fairly: "if you can't explain it or fix it, who
// can?" Nobody could, because the evidence was being thrown away.
//
// The pipeline already labels its own throws ('start failed', 'inference
// timeout', 'analysis failed'). This turns those labels into something a founder
// and an operator can both read, and it never blames the URL for something that
// happened on our side.
//
// Register: lamp, not siren. It says what happened and what they can do, and it
// says "we" when it was us.

const REASONS = {
  'start failed': {
    text: 'we couldn\'t open a session for it',
    ours: true,
  },
  'inference timeout': {
    text: 'the scan didn\'t finish in time',
    ours: true,
  },
  'scan failed': {
    text: 'the scan stopped before it finished — usually the service restarting under it',
    ours: true,
  },
  'analysis failed': {
    text: 'the scan finished but the read didn\'t come back',
    ours: true,
  },
};

/**
 * @param {string} domain the domain that was being read
 * @param {Error|unknown} err whatever the pipeline threw
 * @param {number} [elapsedMs] how long the attempt ran, when known
 * @returns {string} the line to show in place of the reading
 */
export function coldReadFailure(domain, err, elapsedMs) {
  const message = (err && typeof err === 'object' && 'message' in err)
    ? String(err.message)
    : String(err ?? '');

  const known = REASONS[message];
  const seconds = Number.isFinite(elapsedMs) && elapsedMs > 0
    ? ` after ${Math.round(elapsedMs / 1000)}s`
    : '';

  if (known) {
    // Ours to fix — say so plainly rather than sending them to check a URL that
    // was never the problem.
    return `Couldn't read ${domain} — ${known.text}${seconds}. That's on us, not the URL. Try again, or give it another company.`;
  }

  // An unrecognised failure still names itself rather than hiding behind advice.
  const detail = message ? ` (${message})` : '';
  return `Couldn't read ${domain}${seconds}${detail}. Try again, or check the URL.`;
}

export default coldReadFailure;
