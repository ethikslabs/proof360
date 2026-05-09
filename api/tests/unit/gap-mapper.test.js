import { describe, expect, it } from 'vitest';
import { runGapAnalysis } from '../../src/services/gap-mapper.js';

function baseContext(overrides = {}) {
  return {
    compliance_status: 'active',
    identity_model: 'sso',
    insurance_status: 'active',
    founder_profile_completed: true,
    sector: 'saas',
    geo_market: 'US',
    dmarc_policy: 'reject',
    spf_policy: 'strict',
    has_hsts: true,
    has_csp: true,
    has_staging_exposure: false,
    domain_in_breach: false,
    ip_is_abusive: false,
    uses_ai: false,
    handles_personal_data: false,
    pen_test_completed: true,
    has_backup: true,
    aws_program_enrolled: true,
    ...overrides,
  };
}

function gapById(result, gapId) {
  return result.gaps.find((gap) => gap.gap_id === gapId);
}

describe('gap mapper live scoring path', () => {
  it('computes trust score from triggered severity weights', async () => {
    const result = await runGapAnalysis(baseContext({
      dmarc_policy: 'none',
      spf_policy: 'missing',
    }));

    expect(result.gaps.map((gap) => gap.gap_id).sort()).toEqual(['dmarc', 'spf']);
    expect(result.trust_score).toBe(85);
    expect(result.readiness).toBe('ready');
  });

  it('preserves configured time estimates in returned gap objects', async () => {
    const result = await runGapAnalysis(baseContext({
      identity_model: 'password_only',
    }));

    expect(gapById(result, 'mfa')).toMatchObject({
      evidence: [{ source: 'assessment', citation: 'Derived from your assessment responses' }],
      time_estimate: 'Under 1 hour to enable, 30 days to enforce company-wide',
    });
    expect(gapById(result, 'edr')).toMatchObject({
      evidence: [{ source: 'assessment', citation: 'Derived from your assessment responses' }],
      time_estimate: 'Same-day deployment with a cloud-managed agent',
    });
    expect(gapById(result, 'sso')).toMatchObject({
      evidence: [{ source: 'assessment', citation: 'Derived from your assessment responses' }],
      time_estimate: '1–2 days if using Google Workspace or Microsoft 365',
    });
  });

  it('classifies recon-derived evidence sources', async () => {
    const result = await runGapAnalysis(baseContext({
      has_hsts: false,
      has_csp: true,
    }));

    expect(gapById(result, 'security_headers')).toMatchObject({
      evidence: [{ source: 'http_scan', citation: 'Passive HTTP/TLS scan — live headers at time of assessment' }],
      time_estimate: '1–2 hours to configure',
    });
  });
});
