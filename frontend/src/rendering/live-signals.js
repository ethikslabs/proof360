// frontend/src/rendering/live-signals.js
//
// Maps API-shaped inferences (api/src/services/inference-builder.js) onto the
// frontend's ObservedSignal shape (rendering/protocol.js). The API sends
// `{ inference_id, label, confidence: 'confirmed'|'probable', category }` —
// there is no `statement`/`text`/`value`/`domain`/`polarity` field on the wire,
// so this module owns the one place that translates the API's real shape.
// Exported so every live entry point (cold-read analyze, session resume) and
// the test suite share the same mapper instead of drifting apart.
import { makeObservedSignal } from './protocol.js';

// 'observed' is inference-builder.js's confidence grade for a live-probe-derived
// fact (currently the hosting/cloud-provider inference) — mapped to a number
// here only for freshness/ranking math; the frontend's grade-word display
// (protocol.js gradeWord) reads the derived `source` field ('live_probe'
// below), not this number, so the exact value matters less than it being
// distinct from 'probable'/'confirmed'.
const CONFIDENCE_MAP = { confirmed: 0.9, probable: 0.6, observed: 0.85 };

// inference-builder.js's signalCategory() emits: product, market, data,
// company, identity, infrastructure, governance — plus its own 'general'
// fallback for anything not in its map. Only categories with a clear
// frontend-domain home are mapped explicitly below; every other category
// (including 'general' and any future addition) falls back to 'compliance',
// the frontend ObservedSignal domain enum's catch-all.
const DOMAIN_MAP = {
  identity: 'identity',
  infrastructure: 'security',
  data: 'security',
  governance: 'compliance',
  company: 'financial', // stage/entity signals — matches the seed_stage mock precedent (data/mock/signals.js)
};

// The builder never sends polarity — these are neutral, unverified
// observations, not yet judged gap-vs-capability by anyone. ObservationStrip
// (components/chat/ObservationStrip.jsx) renders polarity 'gap' in an
// affirmative/success green and 'capability' in a caution amber; amber's
// "flag for attention, unconfirmed" tone is the closer match for a
// freshly-inferred, not-yet-corrected observation, so 'capability' is the
// neutral default here.
// NOTE (Task 7+ landmine): gapSignals in useSignals.js "drive vendor ranking";
// with this default, live inferences never enter gap-driven ranking — revisit
// polarity derivation when that wiring lands.
const DEFAULT_POLARITY = 'capability';

// A chip must never render blank or a bare boolean (e.g. the literal word
// "True") — belt-and-braces guard alongside the API-side filter in
// inference-builder.js (defense in depth: this mapper is the one place every
// live entry point funnels through, so a future API regression still can't
// reach the chip strip).
function isRenderableLabel(label) {
  if (label === null || label === undefined) return false;
  if (typeof label === 'boolean') return false;
  if (typeof label === 'string' && label.trim() === '') return false;
  return true;
}

export function inferencesToSignals(inferences) {
  return (inferences ?? [])
    .filter(inf => isRenderableLabel(inf?.label))
    .map(inf => makeObservedSignal({
      value: inf.label ?? '',
      domain: DOMAIN_MAP[inf.category] ?? 'compliance',
      polarity: DEFAULT_POLARITY,
      // A probe-derived fact (confidence 'observed') is sourced from the live
      // probe, not a marketing-page scrape — the grade-word display keys off
      // this to read "observed" instead of a confidence-threshold guess.
      source: inf.confidence === 'observed' ? 'live_probe' : 'url_scrape',
      confidence: CONFIDENCE_MAP[inf.confidence] ?? 0.6,
      conflicted: !!inf.conflicted,
      conflict: inf.conflict ?? null,
    }))
    .filter(s => s.value);
}
