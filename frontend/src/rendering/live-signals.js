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

const CONFIDENCE_MAP = { confirmed: 0.9, probable: 0.6 };

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

export function inferencesToSignals(inferences) {
  return (inferences ?? []).map(inf => makeObservedSignal({
    value: inf.label ?? '',
    domain: DOMAIN_MAP[inf.category] ?? 'compliance',
    polarity: DEFAULT_POLARITY,
    source: 'url_scrape',
    confidence: CONFIDENCE_MAP[inf.confidence] ?? 0.6,
  })).filter(s => s.value);
}
