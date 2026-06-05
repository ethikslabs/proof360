// CONTROL/lib/model-resolver.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

export class ModelResolutionError extends Error {
  constructor(role, tried) {
    super(`No valid model for role '${role}' (tried: ${tried.join(', ') || 'none'})`);
    this.name = 'ModelResolutionError';
    this.role = role;
    this.tried = tried;
  }
}

const DEFAULT_REGISTRY = () =>
  JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'models.registry.json'), 'utf8'));

const envKey = (role) => `MODEL_${role.toUpperCase().replace(/-/g, '_')}`;

// Phase 1: verify required_modality + allow_deprecated from modelAttrs when present.
// region/price/allow_preview live in the Phase-2 inventory → unverifiable now (warn, don't reject).
function validate(model, entry, modelAttrs) {
  const c = entry.constraints || {};
  const codes = [], warnings = [];
  const attr = modelAttrs?.[model];
  if (c.required_modality) {
    if (attr?.modality) {
      if (!c.required_modality.some(m => attr.modality.includes(m))) return { ok: false };
      codes.push('modality_valid');
    } else warnings.push('constraint_unverifiable:modality');
  }
  // Each Phase-2 constraint: REJECT when the attr proves a violation; WARN when the attr is absent
  // (unverifiable until the Phase-2 inventory exists) — never silently pass a verifiable violation.
  if (c.allow_deprecated === false) {
    if (attr?.status === 'deprecated') return { ok: false };
    if (attr?.status == null) warnings.push('constraint_unverifiable:deprecated');
  }
  if (c.allow_preview === false) {
    if (attr?.preview === true) return { ok: false };
    if (attr?.preview == null) warnings.push('constraint_unverifiable:preview');
  }
  if (c.required_region != null && !attr?.region) warnings.push('constraint_unverifiable:region');
  if (c.max_price_tier != null && !attr?.price_tier) warnings.push('constraint_unverifiable:price');
  return { ok: true, codes, warnings };
}

export function resolveChain(role, opts = {}) {
  const registry = opts.registry || DEFAULT_REGISTRY();
  const entry = registry[role];
  if (!entry) throw new ModelResolutionError(role, []);
  const env = opts.env || (typeof process !== 'undefined' ? process.env : {});
  const k = envKey(role);
  const cands = [];
  if (env[k]) cands.push({ model: env[k], source: env[`${k}_UNSAFE`] ? 'env_override_unsafe' : 'env_override' });
  cands.push({ model: entry.primary, source: 'primary' });
  for (const f of entry.fallbacks || []) cands.push({ model: f, source: 'fallback' });

  const valid = [], tried = [];
  for (const cand of cands) {
    tried.push(cand.model);
    if (cand.source === 'env_override_unsafe') { valid.push({ model: cand.model, provider: entry.provider, reason_codes: ['env_override_unsafe'] }); continue; }
    const v = validate(cand.model, entry, opts.modelAttrs);
    if (!v.ok) continue;
    // reason_codes shape (the contract Task 2's ledger splits + Task 3's Python must mirror):
    // validity codes (e.g. modality_valid) + constraint_unverifiable:* warnings + fallback_used/env_override tags.
    const reason_codes = [...v.codes, ...v.warnings];
    if (cand.source === 'fallback') reason_codes.push('fallback_used');
    if (cand.source === 'env_override') reason_codes.push('env_override');
    valid.push({ model: cand.model, provider: entry.provider, reason_codes });
  }
  if (valid.length === 0) throw new ModelResolutionError(role, tried);
  return valid;
}

function buildEvent(role, choice, opts) {
  const registry = opts.registry || DEFAULT_REGISTRY();
  const isWarning = (c) => c.startsWith('constraint_unverifiable') || c === 'fallback_used' || c.startsWith('env_override');
  return {
    timestamp: new Date().toISOString(),
    role,
    requested_primary: registry[role]?.primary ?? null,
    selected_model: choice.model,
    provider: choice.provider,
    fallback_used: choice.reason_codes.includes('fallback_used'),
    registry_hash: opts.registryHash ?? null,
    inventory_hash: null,
    reason_codes: choice.reason_codes.filter(c => !isWarning(c)),
    warnings: choice.reason_codes.filter(isWarning),
  };
}

function emitLedger(event) {
  try {
    const dir = join(dirname(fileURLToPath(import.meta.url)), '..', '.ledger');   // CONTROL/.ledger
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'model-resolution.jsonl'), JSON.stringify(event) + '\n', { flag: 'a' });
  } catch {
    // Fail-safe: logging must NEVER break resolution — fall back to stdout, never throw.
    try { console.log(JSON.stringify(event)); } catch {}
  }
}

export function resolve(role, opts = {}) {
  const choice = resolveChain(role, opts)[0];
  (opts.onLedger || emitLedger)(buildEvent(role, choice, opts));
  return choice;
}
