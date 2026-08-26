// Real matched programs, shaped for the projection panels.
//
// The AWS and Microsoft panels rendered hardcoded constants for every company
// that wasn't the Hive & Co demo, asserting entitlements about the founder's own
// accounts: "$10k unclaimed · already granted · expires Q4 · log in to redeem".
// 18 AWS and 12 Microsoft programs with real trigger evaluation were one import
// away the whole time (John, 2026-08-26: "add them in if we have the data").
//
// Returns null when nothing genuinely matched, so the caller falls through
// rather than rendering an empty panel that still implies a match.
const STATUS_BY_CONFIDENCE = { high: 'available', medium: 'eligible' };

function why(matched_on) {
  const parts = (matched_on ?? [])
    .filter((m) => m && m.field && m.value !== undefined && m.value !== null)
    .map((m) => `${String(m.field).replace(/_/g, ' ')} is ${m.value}`);
  return parts.length ? `Matched because your ${parts.join(' and ')}.` : null;
}

export function livePanel(live, key) {
  const raw = live?.[key];
  if (!Array.isArray(raw)) return null;

  // No link, no offer — the same no-dead-controls rule the pathway follows.
  const programs = raw
    .filter((p) => p && p.name && typeof p.url === 'string' && p.url.startsWith('https://'))
    .map((p) => ({
      name: p.name,
      status: STATUS_BY_CONFIDENCE[p.confidence] ?? 'eligible',
      value: p.benefit ?? null,
      detail: why(p.matched_on),
      url: p.url,
    }));

  if (programs.length === 0) return null;

  return {
    // Counts what it has. The old copy announced a catalogue total ("$220k+ in
    // credits sitting unclaimed at your stage") regardless of what matched.
    summary: `${programs.length} program${programs.length === 1 ? '' : 's'} matched to what we know about you so far. Each one lists why it matched — nothing here is a guess about your account.`,
    programs,
  };
}

export default livePanel;

// Which panel a company actually gets.
//
// The first cut read `livePanel(live, key) ?? panel ?? FIXTURE`, which sends a
// real company that matched ZERO programs straight into the demo fixture — and
// tells them "$10k unclaimed · Already granted · log in to redeem" about their own
// AWS account. The fabrication the change removed, re-entered through the failure
// path. (Caught in the deployed bundle, 2026-08-26.)
//
// The fixture is for the Hive & Co walkthrough and nothing else. Every other
// case gets the truth, including "we matched you against the catalogue and
// nothing fit yet", which is a real and useful answer.
export function panelFor({ live, key, fixture, demo = false }) {
  if (demo && fixture) return fixture;

  const matched = livePanel(live, key);
  if (matched) return matched;

  return {
    summary: 'Programs are matched against what we know about you — your stage, what you build, where you run it.',
    programs: [],
    emptyNote: 'Nothing matched yet. As we learn more about you — or as you confirm what we have noted — programs appear here with the reason each one fits.',
  };
}
