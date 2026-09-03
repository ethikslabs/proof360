// Presence by chapter — the /journey replacement for deriveArc() (workshop 2026-09-03).
//
// deriveArc() turned claims into a posture number (BASE 52, gap −9, match +5, outcome +13)
// and drew a curve. That is a score by another name, against the 2026-08-26 ruling. What
// replaces it is not a better number: it is *which rooms the founder has walked into*, per
// chapter, cumulative. A room is one of the six spaces the rail already knows
// (glyphs.jsx: investor · vendors · aws · microsoft · posture · spv). A count of rooms open
// is allowed (John, by design, 2026-09-03); a weighted number is not.
//
// Derived from the record, never authored: a claim lands in a room by its subject, and a
// claim that reality or a provider attested makes the room PRESENT; anything weaker makes it
// PARTIAL. Once a room is open it stays open in later chapters — the record is append-only.

export const SPACES = [
  { id: 'investor',  label: 'Investor readiness' },
  { id: 'vendors',   label: 'Vendors' },
  { id: 'aws',       label: 'AWS programs' },
  { id: 'microsoft', label: 'Microsoft programs' },
  { id: 'posture',   label: 'Posture' },
  { id: 'spv',       label: 'SPV' },
];

export const NOT_YET = 0, PARTIAL = 1, PRESENT = 2;
export const LEVEL_LABEL = ['not yet', 'partial', 'present'];

const ATTESTED = new Set(['reality', 'provider']);

// Subject → room. Order matters: the more specific programs before the vendor catch-all,
// posture is the default because today every live journey claim is a posture field.
export function roomFor(claim) {
  const s = String(claim?.subject || '').toLowerCase();
  if (/^outcome:/.test(s)) return 'vendors';                 // a recommendation, carried out
  if (/spv|vehicle/.test(s)) return 'spv';
  if (/investor|raise|instrument|due_diligence|\bdd\b|cer\b/.test(s)) return 'investor';
  if (/aws|activate|marketplace|bedrock/.test(s)) return 'aws';
  if (/microsoft|azure|founders_hub/.test(s)) return 'microsoft';
  if (/^match:|vendor|cloudflare|vanta|cisco|arctic|cyberpro|insurance/.test(s)) return 'vendors';
  return 'posture';
}

export function levelFor(claim) {
  if (ATTESTED.has(claim?.authority)) return PRESENT;
  return PARTIAL;
}

// entries: [{ claims: [{ subject, authority }] }] in chapter order.
// Returns { rows: [{ id, label, cells: [level per chapter] }], perChapter: [{ open, levels }] }
export function derivePresence(entries) {
  const idx = Object.fromEntries(SPACES.map((sp, i) => [sp.id, i]));
  let carry = SPACES.map(() => NOT_YET);
  const perChapter = (entries || []).map((e) => {
    const levels = carry.slice();
    for (const c of e?.claims || []) {
      const i = idx[roomFor(c)];
      levels[i] = Math.max(levels[i], levelFor(c));
    }
    carry = levels;
    return { levels, open: levels.filter((l) => l > NOT_YET).length };
  });
  const rows = SPACES.map((sp, i) => ({ ...sp, cells: perChapter.map((ch) => ch.levels[i]) }));
  return { rows, perChapter, open: perChapter.length ? perChapter[perChapter.length - 1].open : 0 };
}
