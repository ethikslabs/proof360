// R6 (CANON-hx-loop, 2026-09-13): the absence register is John's spoken line —
// "companies like yours usually go for X, and use Y to get there. Looking at your site and around the web, we couldn't spot
// one on your pages. Do you have it?" Every slot derived, nothing invented:
// cohort from the observed customer type, X from the frameworks map, Y from the
// vendor catalog with the partner stake disclosed, Z the outcome in lamp register.
import { describe, it, expect } from 'vitest';
import { peerReference } from '../../src/services/peer-reference.js';
import { runGapAnalysis } from '../../src/services/gap-mapper.js';
import { buildSystemPrompt } from '../../src/services/persona-prompts.js';
import { buildInferences } from '../../src/services/inference-builder.js';

describe('peerReference — the sentence', () => {
  it('soc2 for an observed enterprise cohort: peers, framework, partner vendor with stake, outcome, question', () => {
    const line = peerReference('soc2', { customer_type: 'Enterprise (B2B)' });
    expect(line).toMatch(/^Companies like yours usually go for SOC 2/);
    expect(line).toContain('use Vanta');
    expect(line).toContain('EthiksLabs partner');
    expect(line).toContain('20% off first year');
    expect(line).toContain('to get there');
    expect(line).toMatch(/Looking at your site and around the web, we couldn't spot it\. Do you have it\?$/);
  });

  it('never grades: no "need", "your gap", "you lack", "critical", or a number', () => {
    const line = peerReference('soc2', { customer_type: 'Enterprise (B2B)' });
    expect(line).not.toMatch(/\byou need\b|your gap|you lack|critical|\d+\s*\/\s*100/i);
  });

  it('is null when the customer type was not observed — "like yours" is never invented', () => {
    expect(peerReference('soc2', {})).toBeNull();
    expect(peerReference('soc2', { customer_type: 'Unknown' })).toBeNull();
    expect(peerReference('soc2', { customer_type: 'Consumer (B2C)' })).toBeNull();
  });

  it('is null when the cohort does not usually go for that framework (SMB and SOC 2)', () => {
    expect(peerReference('soc2', { customer_type: 'SMB (B2B)' })).toBeNull();
  });

  it('penetration_testing has its own authored pursuit and outcome', () => {
    const line = peerReference('penetration_testing', { customer_type: 'Enterprise (B2B)' });
    expect(line).toMatch(/^Companies like yours usually go for an independent penetration test/);
    expect(line).toContain('to get there');
    expect(line).toMatch(/Do you have (it|one)\?$/);
  });

  it('is null for a gap with no authored peer line', () => {
    expect(peerReference('dmarc', { customer_type: 'Enterprise (B2B)' })).toBeNull();
  });
});

describe('peer line rides the absence through the pipeline', () => {
  it('gap-mapper attaches peer_line to a not_observed gap when the cohort is observed', async () => {
    const r = await runGapAnalysis({ compliance_status: 'unknown', customer_type: 'Enterprise (B2B)' });
    const soc2 = r.gaps.find((g) => g.gap_id === 'soc2');
    expect(soc2.state).toBe('not_observed');
    expect(soc2.peer_line).toMatch(/^Companies like yours usually go for SOC 2/);
  });

  it('gap-mapper attaches no peer_line to an observed gap', async () => {
    const r = await runGapAnalysis({ compliance_status: 'none', customer_type: 'Enterprise (B2B)' });
    const soc2 = r.gaps.find((g) => g.gap_id === 'soc2');
    expect(soc2.state).toBe('observed');
    expect(soc2.peer_line ?? null).toBeNull();
  });

  it('the persona absence block carries the sentence, not the bare gap name', () => {
    const gap = { gap_id: 'soc2', severity: 'critical', title: 'SOC 2 certification gap', state: 'not_observed',
      peer_line: peerReference('soc2', { customer_type: 'Enterprise (B2B)' }) };
    const prompt = buildSystemPrompt('sophia', { company_name: 'Cognisys', gaps: [gap] });
    const block = prompt.slice(prompt.indexOf("Things we couldn't spot (absences, NOT findings)"));
    expect(block).toContain('Companies like yours usually go for SOC 2');
    expect(block).not.toContain('- SOC 2 certification gap');
  });

  it('inference-builder puts the sentence on the placeholder when customer type was read', () => {
    const signals = [{ type: 'customer_type', value: 'Enterprise (B2B)', confidence: 'probable' }];
    const { inferences } = buildInferences(signals, ['https://x.com'], 'https://x.com');
    const inf = inferences.find((i) => i.inference_id === 'inf_compliance');
    expect(inf.state).toBe('not_observed');
    expect(inf.peer_line).toMatch(/^Companies like yours usually go for SOC 2/);
    expect(inf.label).toBe("SOC 2: we couldn't spot one on the pages we read");
  });

  it('inference-builder leaves peer_line null when customer type was not read', () => {
    const { inferences } = buildInferences([], ['https://x.com'], 'https://x.com');
    const inf = inferences.find((i) => i.inference_id === 'inf_compliance');
    expect(inf.peer_line ?? null).toBeNull();
  });
});
