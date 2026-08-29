// The vehicle (customer-facing noun: **Passport**) is the living record we hold for a
// customer. CERs are instruments issued against it — see cer-projection.js. That file
// already proves the pattern this one reuses: a pure fold over append-only records,
// projected per viewer at read time, never mutated and never rendered-then-hidden.
//
// This is the third instance of that pattern and the one that was missing. CORPUS grows
// the evidence; cer-projection folds engagements; nothing held the record they both hang
// off. It lived as a hand-authored seed and five hand-written HTML pages
// (_working/04_SITES/hiveandco-vehicle-*.html). Those pages are lenses. Lenses are data.
//
// Precedence lattice (canon 2026-07-16, ratified 2026-07-17): a field can be asserted by
// several sources at once, so the winner is decided by layer, then recency — never by
// write order.
export const FACT_LAYERS = ['inferred', 'declared', 'corrected', 'attested'];

const RANK = Object.fromEntries(FACT_LAYERS.map((l, i) => [l, i]));

export function layerRank(layer) {
  const r = RANK[layer];
  if (r === undefined) throw new Error(`unknown_fact_layer:${layer}`);
  return r;
}

// A fact is evidence-backed when something outside the founder's own account put it there:
// we observed it (inferred) or a third party attested it. `declared` is the founder's
// story; `corrected` is the founder correcting it after being shown the evidence.
export function isEvidenceBacked(fact) {
  // Illustrative content is never evidence, whatever layer it carries. John's seed marks it
  // with an ILLUSTRATIVE badge and his 2026-07-19 ruling put a visible pill on the mock CER
  // for the same reason. If demo content could count as evidence it would compute against a
  // real founder's declared fact and the record would accuse them on the strength of a
  // placeholder — the defect the 2026-07-20 sequencing ruling exists to prevent.
  if (fact.illustrative) return false;
  return fact.layer === 'inferred' || fact.layer === 'attested';
}

function ts(fact) {
  return Date.parse(fact.observed_at ?? 0) || 0;
}

// Highest layer wins; ties break to the most recently observed. Pure, total, and stable
// for equal inputs — the same guarantee cerProjection() makes.
export function winningFact(facts) {
  return facts.reduce((best, f) => {
    if (!best) return f;
    const dl = layerRank(f.layer) - layerRank(best.layer);
    if (dl !== 0) return dl > 0 ? f : best;
    return ts(f) > ts(best) ? f : best;
  }, null);
}

export function foldFacts(records) {
  const byKey = new Map();
  for (const f of records) {
    if (!byKey.has(f.key)) byKey.set(f.key, []);
    byKey.get(f.key).push(f);
  }
  const out = {};
  for (const [key, facts] of byKey) {
    const win = winningFact(facts);
    out[key] = { ...win, superseded: facts.filter((f) => f !== win) };
  }
  return out;
}

function comparable(v) {
  return typeof v === 'string' ? v.trim().toLowerCase() : v;
}

// The section John hand-wrote into the DD lens — "Where the founder's story disagrees with
// the evidence" — is not a page. It is this function. A disagreement is a key where the
// founder declared one value and something evidence-backed says another.
//
// A `corrected` fact means the founder has already been shown the evidence and moved, so
// that key is settled and drops out. That is the whole point of the lattice.
export function disagreements(records) {
  const byKey = new Map();
  for (const f of records) {
    if (!byKey.has(f.key)) byKey.set(f.key, []);
    byKey.get(f.key).push(f);
  }

  const out = [];
  for (const [key, facts] of byKey) {
    if (facts.some((f) => f.layer === 'corrected')) continue;
    const declared = winningFact(facts.filter((f) => f.layer === 'declared'));
    if (!declared) continue;
    const conflicting = facts
      .filter(isEvidenceBacked)
      .filter((f) => comparable(f.value) !== comparable(declared.value));
    if (!conflicting.length) continue;

    const evidence = winningFact(conflicting);
    out.push({
      key,
      declared: { value: declared.value, source: declared.source, observed_at: declared.observed_at },
      evidence: { value: evidence.value, layer: evidence.layer, source: evidence.source, observed_at: evidence.observed_at },
      // Which one the record actually stands behind — the evidence does not automatically
      // win, the lattice decides. A founder's `declared` outranks a bare `inferred`.
      stands: winningFact([declared, evidence]).layer,
      others: conflicting.filter((f) => f !== evidence).length,
    });
  }
  return out.sort((a, b) => a.key.localeCompare(b.key));
}

// No-leak, enforced at read time. A fact with no `audiences` is open to every audience the
// lens is issued to; a fact that names them is filtered here, before it is ever rendered.
export function visibleTo(fact, audience) {
  if (!fact?.audiences) return true;
  return fact.audiences.includes(audience);
}

// One projector, N lenses. This is the function the five hand-written HTML pages were
// each a frozen output of.
//
// Honesty rule, and the reason this does not just return {}: a section with nothing behind
// it renders as `not_yet_sourced`, never as absent and never as invented. John's own canon
// killed a build for exactly this — a rail evidenced for two of ten beats and silently
// made up for the other eight. An empty section is a true statement about the record.
export function projectVehicleForViewer(vehicle, lens, { audience = lens.audience } = {}) {
  const folded = foldFacts(vehicle.facts ?? []);
  const visible = Object.fromEntries(
    Object.entries(folded).filter(([, f]) => visibleTo(f, audience)),
  );

  const sections = lens.sections.map((section) => {
    const body = sectionBody(section, { vehicle, visible, audience });
    return {
      title: section.title,
      kind: section.kind,
      ...(body.length ? { entries: body } : { status: 'not_yet_sourced' }),
    };
  });

  return {
    vehicle_id: vehicle.vehicle_id,
    passport: vehicle.passport,
    lens: lens.id ?? lens.label,
    for: lens.person ?? lens.audience,
    question: lens.question,
    audience,
    entry_count: Object.keys(visible).length + (vehicle.engagements?.length ?? 0),
    sections,
  };
}

function matches(row, filter) {
  if (!filter) return true;
  return Object.entries(filter).every(([k, v]) => row[k] === v);
}

// Every entry carries its own receipt — the source it came from and the layer that put it
// there. "Memory with receipts": the record remembers you and can prove why.
function sectionBody(section, { vehicle, visible, audience }) {
  switch (section.kind) {
    case 'facts':
      return Object.values(visible)
        .filter((f) => f.group === section.group)
        .map((f) => ({
          key: f.key,
          value: f.value,
          receipt: { layer: f.layer, source: f.source, observed_at: f.observed_at },
          ...(f.superseded.length ? { superseded_by_count: f.superseded.length } : {}),
        }));

    case 'disagreements':
      return disagreements(vehicle.facts ?? []);

    case 'domains':
      return (vehicle.trust_posture?.domains ?? []).filter((d) => matches(d, section.filter));

    case 'gaps':
      return (vehicle.trust_posture?.gaps ?? []).filter((g) => matches(g, section.filter));

    case 'engagements':
      return (vehicle.engagements ?? [])
        .filter((e) => matches(e, section.filter))
        .filter((e) => !e.visibility_policy || e.visibility_policy.allowed_audiences.includes(audience));

    case 'usage':
      return vehicle.usage ?? [];

    default:
      throw new Error(`unknown_section_kind:${section.kind}`);
  }
}
