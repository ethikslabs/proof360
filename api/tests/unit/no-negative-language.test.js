// CANON-hx-loop R8 (14 Sept 2026): "For the language 'you haven't, you don't' —
// they are negative, in person I would never say that … negative language is a
// no no." A second-person deficit never leaves the machine in any channel. An
// absence is spoken as WE + the method ("scanning your site and having a look
// around the web, we couldn't spot …"). This test reads the copy, not the model.
import { describe, it, expect } from 'vitest';
import { GAP_DEFINITIONS } from '../../src/config/gaps.js';
import { VENDORS } from '../../src/config/vendors.js';
import { peerReference } from '../../src/services/peer-reference.js';
import { CUSTOMER_TYPE_TO_FRAMEWORK_KEY } from '../../src/services/cold-reading.js';
import { buildInferences } from '../../src/services/inference-builder.js';
import { buildSystemPrompt } from '../../src/services/persona-prompts.js';

const PERSONA_IDS = ['sophia','leonardo','edison'];

export const SECOND_PERSON_DEFICIT = new RegExp([
  String.raw`\b(?:you|you've|you have)\s+(?:don'?t|do not|haven'?t|have not|lack|have no|never|aren'?t|are not|fail|cannot|can'?t|have limited)\b`,
  String.raw`\byou(?:'re| are)?\s+(?:handling|handle)\b[^.]*\bwithout\b`,
  String.raw`\byou(?:'re| are)\s+(?:exposed|carrying|not|asking)\b`,
  String.raw`\byour (?:gap|weakness|failure)s?\b`,
].join('|'), 'i');
import { runGapAnalysis } from '../../src/services/gap-mapper.js';

// Everything fires, both DMARC branches, the Cloudflare branch of security_headers.
const FIRE_ALL = {
  sector: 'healthcare', data_sensitivity: 'PII', handles_personal_data: true, uses_ai: true, handles_payments: true,
  geo_market: 'AU', customer_type: 'Enterprise (B2B)', product_type: 'B2B SaaS', compliance_status: 'none',
  insurance_status: 'none', has_backup: false, pen_test_completed: false, identity_model: 'password_only',
  questionnaire_experience: 'stalled_deal', spf_policy: 'missing', has_hsts: false, has_csp: false,
  has_staging_exposure: true, domain_in_breach: true, ip_is_abusive: true, tls_is_current: false,
};

function strings(value, out = []) {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => strings(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => strings(v, out));
  return out;
}

describe('R8 — gap copy never marks the founder', () => {
  for (const gap of GAP_DEFINITIONS) {
    it(`${gap.id}: label, why, risk, remediation, peer`, () => {
      const copy = strings({ label: gap.label, why: gap.why, risk: gap.risk, remediation: gap.remediation, peer: gap.peer });
      for (const s of copy) expect(s, s).not.toMatch(SECOND_PERSON_DEFICIT);
    });
  }
});

describe('R8 — the copy that actually ships (gap-mapper overrides why/risk at runtime)', () => {
  for (const variant of [{ dmarc_policy: 'none', cdn_provider: 'Cloudflare' }, { dmarc_policy: 'missing' }]) {
    it(`every returned gap, ${JSON.stringify(variant)}`, async () => {
      const { gaps } = await runGapAnalysis({ ...FIRE_ALL, ...variant });
      expect(gaps.length).toBeGreaterThan(15);
      for (const g of gaps) {
        for (const s of strings({ title: g.title, why: g.why, risk: g.risk, remediation: g.remediation, peer_line: g.peer_line })) {
          expect(s, `${g.gap_id}: ${s}`).not.toMatch(SECOND_PERSON_DEFICIT);
        }
      }
    });
  }
});

describe('R8 — vendor copy never marks the founder', () => {
  it('every string in the catalog', () => {
    for (const s of strings(VENDORS)) expect(s, s).not.toMatch(SECOND_PERSON_DEFICIT);
  });
});

describe('R8 — the absence sentence is we + the method, then the question', () => {
  const cohorts = Object.keys(CUSTOMER_TYPE_TO_FRAMEWORK_KEY);
  it('every peer line that fires', () => {
    let fired = 0;
    for (const gap of GAP_DEFINITIONS.filter((g) => g.peer)) {
      for (const customer_type of cohorts) {
        const line = peerReference(gap.id, { customer_type });
        if (!line) continue;
        fired += 1;
        expect(line).not.toMatch(SECOND_PERSON_DEFICIT);
        expect(line).toMatch(/we couldn't spot/i);
        expect(line).toMatch(/your site/i);
        expect(line).toMatch(/\?$/);
        expect(line).not.toMatch(/didn't see/i);
      }
    }
    expect(fired).toBeGreaterThan(0);
  });

  it('the compliance placeholder label', () => {
    const { inferences } = buildInferences([], ['https://x.com'], 'https://x.com');
    const inf = inferences.find((i) => i.inference_id === 'inf_compliance');
    expect(inf.label).not.toMatch(SECOND_PERSON_DEFICIT);
  });

  it('the persona absence block, for every persona', () => {
    const gaps = [
      { gap_id: 'data_privacy', title: 'Data privacy compliance gap', state: 'not_observed', severity: 'moderate', why: 'x' },
      { gap_id: 'soc2', title: 'SOC 2 certification gap', state: 'not_observed', severity: 'moderate', peer_line: peerReference('soc2', { customer_type: 'Enterprise (B2B)' }) },
    ];
    // One partner mention per block, not one per absence (round 2, finding 4).
    const many = ['soc2', 'penetration_testing', 'data_privacy'].map((id) => ({ gap_id: id, title: id, state: 'not_observed', severity: 'moderate', peer_line: peerReference(id, { customer_type: 'Enterprise (B2B)' }) }));
    const blockOf = (p) => p.slice(p.indexOf("Things we couldn't spot")).split('\n\n')[0];
    expect((blockOf(buildSystemPrompt('sophia', { gaps: many, company_name: 'REACH' })).match(/EthiksLabs partner/g) || []).length).toBeLessThanOrEqual(1);
    // founder_trust is never a web absence.
    expect(buildSystemPrompt('sophia', { gaps: [{ gap_id: 'founder_trust', title: 'Founder & leadership trust gap', state: 'not_observed', severity: 'low' }], company_name: 'REACH' })).not.toContain("Things we couldn't spot");
    for (const persona of PERSONA_IDS) {
      const prompt = buildSystemPrompt(persona, { gaps, company_name: 'REACH' });
      // The persona's own standing instructions address the model ("You never lecture");
      // the absence block and everything it hands the advisor to say must carry none of
      // the forms John named.
      const block = prompt.slice(prompt.indexOf("Things we couldn't spot")).split('\n\n')[0]; // the block, not the persona's standing instructions after it
      expect(block.length, persona).toBeGreaterThan(40);
      expect(block, persona).not.toMatch(SECOND_PERSON_DEFICIT);
      expect(prompt, persona).not.toMatch(/\byou (?:don'?t|haven'?t|lack|have no)\b|\byour gap\b/i);
      expect(block, persona).toMatch(/couldn't spot/i);
    }
  });
});
