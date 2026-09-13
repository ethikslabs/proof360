// HX loop finding 8 (re-walk 13 Sept 2026, lxplatform.io): fix 1 tagged two gaps
// as absences and left every other gap born "observed". Sophia then said "you
// don't yet have a published Privacy Policy" about a policy nobody read. The
// rule is the class, default-deny (CANON-hx-loop R8 + BRAIN.md law 5): a gap is
// `observed` only when a probe or the founder spoke to what its claim asks;
// a gap whose trigger is a category fact (handles PII, sector, uses AI) fires
// as `not_observed`. Opt-in `absenceCondition` is gone; `observedBy` is opt-out.
import { describe, it, expect } from 'vitest';
import { GAP_DEFINITIONS } from '../../src/config/gaps.js';
import { runGapAnalysis } from '../../src/services/gap-mapper.js';
import { buildSystemPrompt } from '../../src/services/persona-prompts.js';
import { recompute } from '../../src/services/recompute.js';
import { SEVERITY_WEIGHTS } from '../../src/config/gaps.js';

// lxplatform.io as the read saw it: category facts only, no probe deficit, no founder answer.
const DERIVED_ONLY = {
  sector: 'healthcare', data_sensitivity: 'PII', handles_personal_data: true, uses_ai: true,
  handles_payments: true, geo_market: 'AU', customer_type: 'Enterprise (B2B)',
  product_type: 'B2B SaaS', compliance_status: 'unknown', insurance_status: 'unknown',
  has_backup: null, pen_test_completed: undefined,
};
// Things the perimeter probes actually saw.
const PROBED = {
  dmarc_policy: 'none', spf_policy: 'missing', has_hsts: false, has_csp: false,
  has_staging_exposure: true, domain_in_breach: true, ip_is_abusive: true, tls_is_current: false,
};
// Things the founder said.
const SPOKEN = {
  has_backup: false, insurance_status: 'none', pen_test_completed: false,
  identity_model: 'password_only', questionnaire_experience: 'stalled_deal', compliance_status: 'none',
};
// The only definitions allowed to be observed off nothing but their trigger: perimeter probes
// (the trigger field only exists when a probe ran) and program eligibility (a positive derived
// fact, not a deficit). Adding an id here is a deliberate act, reviewed as one.
const ALWAYS_OBSERVED = new Set([
  'dmarc', 'spf', 'security_headers', 'staging_exposure', 'domain_breach', 'tls_configuration', 'ip_reputation',
  'aws_program_eligibility', 'microsoft_program_eligibility',
]);
const NOT_A_DEFICIT = new Set(['aws_program_eligibility', 'microsoft_program_eligibility']);

describe('default-deny: a gap fired from category facts alone is not_observed', () => {
  it('every gap that fires on the derived-only context is not_observed (bar the non-deficits)', async () => {
    const { gaps } = await runGapAnalysis(DERIVED_ONLY);
    expect(gaps.length).toBeGreaterThan(3);
    for (const g of gaps) {
      if (NOT_A_DEFICIT.has(g.gap_id)) continue;
      expect(g.state, `${g.gap_id} fired from a category fact and must be not_observed`).toBe('not_observed');
      expect(g.score_impact, `${g.gap_id} absence carries no weight`).toBe(0);
    }
  });

  it('data_privacy on the lxplatform shape is an absence, and no persona is handed it as a finding', async () => {
    const { gaps } = await runGapAnalysis(DERIVED_ONLY);
    const privacy = gaps.find((g) => g.gap_id === 'data_privacy');
    expect(privacy).toBeDefined();
    expect(privacy.state).toBe('not_observed');
    const prompt = buildSystemPrompt('sophia', { gaps, company_name: 'REACH' });
    expect(prompt.split("Things we couldn't spot")[0]).not.toMatch(/Gaps identified:[\s\S]*Data privacy/);
    expect(prompt).not.toMatch(/\byou (don'?t|do not|haven'?t|have not|lack|have no)\b/i);
  });

  it('the default is pinned structurally: no definition is observed off an empty context unless allow-listed', () => {
    for (const gap of GAP_DEFINITIONS) {
      expect(gap.absenceCondition, `${gap.id} still carries the opt-in absenceCondition`).toBeUndefined();
      const offNothing = gap.observedBy?.({}) === true;
      if (ALWAYS_OBSERVED.has(gap.id)) expect(offNothing, `${gap.id} is allow-listed and must declare observedBy: () => true`).toBe(true);
      else expect(offNothing, `${gap.id} is observed off an empty context; a new always-observed gap must be allow-listed on purpose`).toBe(false);
    }
  });

  it('founder_trust fires for everyone off an unfilled form: an absence, never the one counted gap', async () => {
    const { gaps } = await runGapAnalysis(DERIVED_ONLY);
    const ft = gaps.find((g) => g.gap_id === 'founder_trust');
    expect(ft).toBeDefined();
    expect(ft.state).toBe('not_observed');
    expect(ft.score_impact).toBe(0);
  });

  it('an absence carries no consequence copy, only the peer sentence or nothing', async () => {
    const { gaps } = await runGapAnalysis(DERIVED_ONLY);
    for (const g of gaps.filter((x) => x.state === 'not_observed')) {
      expect(g.risk, g.gap_id).toBeNull();
      if (g.peer_line) expect(g.why).toBe(g.peer_line); else expect(g.why).toBeNull();
    }
  });

  it('the recompute engine carries the same state and weighs only what was observed', () => {
    const out = recompute({
      signals: [],
      recon_outputs: [
        { source: 'dns', payload: { dmarc_policy: 'none', spf_policy: 'missing' } },
        { source: 'http', payload: { has_hsts: false, has_csp: false } },
      ],
      session: { id: 'absence-default-deny', status: 'tier2_published' },
      gaps_config: GAP_DEFINITIONS, gaps_db: [],
    });
    const ds = out.derived_state;
    const gaps = ds.gaps || [];
    expect(gaps.length).toBeGreaterThan(0);
    for (const g of gaps) expect(['observed', 'not_observed'], g.id).toContain(g.state);
    for (const id of ['dmarc', 'spf', 'security_headers']) expect(gaps.find((g) => g.id === id)?.state, id).toBe('observed');
    const ft = gaps.find((g) => g.id === 'founder_trust');
    expect(ft, 'founder_trust fires for everyone').toBeDefined();
    expect(ft.state).toBe('not_observed');
    for (const g of gaps.filter((x) => x.state === 'not_observed')) { expect(g.why, g.id).toBeNull(); expect(g.risk, g.id).toBeNull(); }
    for (const v of ds.vendor_recommendations || []) expect(v.matched_gaps ?? v.gap_ids ?? v.closes ?? [], `${v.slug || v.vendor || v.name}: a vendor off an absence`).not.toContain('data_privacy');
    const expected = 100 - gaps.filter((g) => g.state === 'observed').reduce((n, g) => n + (SEVERITY_WEIGHTS[g.severity] || 0), 0);
    expect(ds.trust_score).toBe(Math.max(0, expected));
    for (const h of ds.directional_hints?.items || []) expect(h).not.toMatch(/governance gaps need attention|below enterprise baseline/);
  });
});

describe('observed: a probe saw it, or the founder said it', () => {
  it('perimeter deficits are observed', async () => {
    const { gaps } = await runGapAnalysis({ ...DERIVED_ONLY, ...PROBED });
    for (const id of ['dmarc', 'spf', 'security_headers', 'staging_exposure', 'domain_breach', 'ip_reputation', 'tls_configuration']) {
      const g = gaps.find((x) => x.gap_id === id);
      expect(g, `${id} should fire`).toBeDefined();
      expect(g.state, `${id} was probed`).toBe('observed');
    }
  });

  it("the founder's own answers are observed", async () => {
    const { gaps } = await runGapAnalysis({ ...DERIVED_ONLY, ...SPOKEN });
    // soc2 on 'none' pins the definition; no pipeline path produces 'none' today (the R9 ladder is the path).
    for (const id of ['backup_dr', 'cyber_insurance', 'penetration_testing', 'mfa', 'vendor_questionnaire', 'soc2']) {
      const g = gaps.find((x) => x.gap_id === id);
      expect(g, `${id} should fire`).toBeDefined();
      expect(g.state, `${id} came from the founder's word`).toBe('observed');
    }
  });

  it('"Not sure" is not an answer that observes anything', async () => {
    const { gaps } = await runGapAnalysis({ ...DERIVED_ONLY, has_backup: null, insurance_status: 'unknown', pen_test_completed: null });
    for (const id of ['backup_dr', 'cyber_insurance', 'penetration_testing']) {
      const g = gaps.find((x) => x.gap_id === id);
      expect(g, `${id} should fire`).toBeDefined();
      expect(g.state).toBe('not_observed');
    }
  });
});
