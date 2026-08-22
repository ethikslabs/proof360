// Trigger evaluator (ETHL-WRK-SPEC-011 D4) — pure functions from the capability
// register's trigger expressions to shortlist proposals.
//
// THE LAW: triggers fire on CONFIRMED claims only (confirmed or corrected — both are
// first-party testimony). An inferred claim never fires a commercial proposal; an
// absent claim never satisfies any operator (we never pitch off a guess OR off
// absence). Anything the parser cannot read becomes `unparsed` and never fires —
// fail-closed, same default-deny posture as every write gate in the estate.
//
// Two trigger dialects ride the register CSV (authored SSOT):
//   expr : `stage in [Pre-seed, Seed] AND has_raised_institutional = false`
//          ops: `=` `!=` `in [..]` `present`, conjoined with AND
//   gaps : `Surfaces when CER shows open gaps: soc2, compliance`
//          fires on ANY overlap with the session's open gaps (gap-mapper output)
import { fieldLabel } from './claims-projection.js';

// Register trigger field → Record claim field.
const TRIGGER_FIELD_TO_CLAIM = {
  stage: 'company.stage',
  product_type: 'product.type',
  sector: 'company.sector',
  geo_market: 'company.geo_market',
  has_raised_institutional: 'company.has_raised_institutional',
  abn_entity_type: 'company.abn_entity_type',
  infrastructure: 'infrastructure.cloud_provider',
  customer_type: 'market.customer_type',
};

const GAPS_PREFIX = /^surfaces when cer shows open gaps:\s*/i;

export function parseTrigger(raw) {
  const trigger = String(raw || '').trim();
  if (!trigger) return { kind: 'unparsed', raw: trigger };

  if (GAPS_PREFIX.test(trigger)) {
    const gaps = trigger.replace(GAPS_PREFIX, '').split(',').map((g) => g.trim()).filter(Boolean);
    return gaps.length ? { kind: 'gaps', gaps, raw: trigger } : { kind: 'unparsed', raw: trigger };
  }

  const conditions = [];
  for (const part of trigger.split(/\s+AND\s+/)) {
    let m;
    if ((m = part.match(/^(\w+)\s+in\s+\[([^\]]+)\]$/))) {
      conditions.push({ field: m[1], op: 'in', values: m[2].split(',').map((v) => v.trim()) });
    } else if ((m = part.match(/^(\w+)\s+present$/))) {
      conditions.push({ field: m[1], op: 'present' });
    } else if ((m = part.match(/^(\w+)\s*!=\s*(.+)$/))) {
      conditions.push({ field: m[1], op: 'ne', value: m[2].trim() });
    } else if ((m = part.match(/^(\w+)\s*=\s*(.+)$/))) {
      conditions.push({ field: m[1], op: 'eq', value: m[2].trim() });
    } else {
      return { kind: 'unparsed', raw: trigger }; // one unreadable clause poisons the whole trigger
    }
  }
  return { kind: 'expr', conditions, raw: trigger };
}

// "B2B SaaS" == "b2b_saas" == "b2b saas" — case- and separator-insensitive.
function norm(value) {
  return String(value).toLowerCase().trim().replace(/[\s-]+/g, '_');
}

function confirmedByTriggerField(claims) {
  const byField = new Map();
  for (const claim of claims) {
    if (claim.status !== 'confirmed' && claim.status !== 'corrected') continue;
    byField.set(claim.field, claim);
  }
  return byField;
}

export function evaluateTrigger(parsed, { claims = [], openGaps = [] } = {}) {
  if (parsed.kind === 'gaps') {
    const open = new Set(openGaps);
    const gaps_cited = parsed.gaps.filter((g) => open.has(g));
    return { fired: gaps_cited.length > 0, claims_cited: [], gaps_cited };
  }

  if (parsed.kind !== 'expr') return { fired: false, claims_cited: [], gaps_cited: [] };

  const byField = confirmedByTriggerField(claims);
  const claims_cited = [];
  for (const cond of parsed.conditions) {
    const claimField = TRIGGER_FIELD_TO_CLAIM[cond.field];
    const claim = claimField ? byField.get(claimField) : null;
    if (!claim) return { fired: false, claims_cited: [], gaps_cited: [] };

    const v = norm(claim.value);
    let holds = false;
    if (cond.op === 'present') holds = true;
    else if (cond.op === 'eq') holds = v === norm(cond.value);
    else if (cond.op === 'ne') holds = v !== norm(cond.value);
    else if (cond.op === 'in') holds = cond.values.some((cand) => norm(cand) === v);
    if (!holds) return { fired: false, claims_cited: [], gaps_cited: [] };

    claims_cited.push({ claim_id: claim.claim_id, field: claim.field, value: claim.value });
  }
  return { fired: true, claims_cited, gaps_cited: [] };
}

// The reason on the proposal's face (D5) — disclosed-stake recommendation model.
function proposalReason(entry, claims_cited, gaps_cited) {
  const parts = [];
  if (claims_cited.length) {
    parts.push(claims_cited
      .map((c) => `your ${fieldLabel(c.field)} is confirmed as ${c.value}`)
      .join(' and '));
  }
  if (gaps_cited.length) {
    parts.push(`the ${gaps_cited.join(', ')} gap${gaps_cited.length > 1 ? 's are' : ' is'} open on your read`);
  }
  return `${entry.title} proposed because ${parts.join(', and ')}.`;
}

export function evaluateRegister(register, { claims = [], openGaps = [] } = {}) {
  const proposals = [];
  for (const entry of register) {
    const parsed = parseTrigger(entry.trigger);
    const result = evaluateTrigger(parsed, { claims, openGaps });
    if (!result.fired) continue;
    proposals.push({
      id: entry.id,
      kind: entry.kind,
      title: entry.title,
      description: entry.description,
      url: entry.url || null,
      cer_route: entry.cer_route,
      trigger: entry.trigger,
      claims_cited: result.claims_cited,
      gaps_cited: result.gaps_cited,
      reason: proposalReason(entry, result.claims_cited, result.gaps_cited),
    });
  }
  return proposals;
}
