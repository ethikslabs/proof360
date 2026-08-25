// Honesty wave (John walk findings 2026-08-25), items 1 + 3, plus the
// complete-review follow-ups (C1/C2 2026-08-25):
//
// Item 1 — hosting conflicts are surfaced as a question, never a silent pick.
// The live rehearsal bug: an extraction-derived "Hosted on AWS" claim and the
// live IP probe's "Oracle" finding both rendered with no reconciliation. Fix:
// the probe (truth ladder: live probe > extracted text) becomes the primary
// `inf_infrastructure` inference, but the extracted claim is kept visible as
// the conflicting witness via `conflicted: true` + `conflict: {probe_says,
// source_says}` — never dropped, never silently picked.
//
// Mid-build amendment (John ruling): AWS-vs-Oracle is usually NOT a conflict —
// it's two different claim TYPES. "Hosted on X" (their own infra — the only
// thing the probe can testify about) vs "works with X" (a business
// relationship read off marketing text, e.g. a consultancy that implements
// AWS for clients while hosting its own site on Oracle). signal-extractor.js
// re-types text-derived cloud mentions accordingly: only an EXPLICIT
// self-hosting statement becomes `type: 'infrastructure'`; everything else is
// `type: 'works_with'`, which never competes with the probe.
//
// C1/C2 (review 2026-08-25) — the ORIGINAL fixtures above fed `recon =
// { cloud_provider: 'Oracle' }` directly. That is not a shape the real
// pipeline can emit: recon-ip.js's detectCloudProvider() only ever returned
// AWS/GCP/Azure/null (no Oracle branch), and classifyHosting() fell through
// to the RAW org string ("Oracle Corporation") for anything it couldn't
// classify — so a real probe hit would produce `hosting_provider: 'Oracle
// Corporation'`, never a clean `cloud_provider: 'Oracle'`. Two bugs followed:
// (a) recon-ip.js never taught to canonicalize Oracle — fixed by adding
// Oracle branches to classifyHosting()/detectCloudProvider(); (b)
// inference-builder.js's sameProvider() only did exact-key matching, so a raw
// "Oracle Corporation" probe hit against a text claim of "Oracle" registered
// as a MANUFACTURED conflict. Fixed by canonicalProviderLabel() + a fuzzy
// substring fallback in sameProvider(), reused for display labels too (no
// raw org text or mis-cased alias ever reaches the founder — review M7).
// Below, fixtures now use the real raw-org shape recon-ip.js actually
// produces for a provider it recognises by name but not by ASN pattern.
//
// Item 3 — label hygiene: no "Software product product" doubling, no bare
// boolean chips ("True"/empty), every boolean signal type gets a human label.
import { describe, it, expect } from 'vitest';
import { buildInferences, sameProvider, canonicalProviderLabel } from '../../src/services/inference-builder.js';

function infra(inferences) {
  return inferences.find((i) => i.inference_id === 'inf_infrastructure');
}

describe('buildInferences — hosting conflict (probe vs extracted text)', () => {
  it('marks a true conflict: explicit self-hosting claim disagrees with the live probe', () => {
    const signals = [{ type: 'infrastructure', value: 'AWS', confidence: 'probable', claim_type: 'hosting' }];
    // Real shape: recon-ip.js's cloud_provider field, now that Oracle
    // canonicalizes cleanly there too.
    const recon = { cloud_provider: 'Oracle' };

    const result = buildInferences(signals, ['homepage'], 'https://cognisys.example', recon);
    const hosting = infra(result.inferences);

    expect(hosting).toBeTruthy();
    expect(hosting.conflicted).toBe(true);
    expect(hosting.conflict).toEqual({ probe_says: 'Oracle', source_says: 'AWS' });
    // Truth ladder: the probe is primary — the label states what we can see live.
    expect(hosting.label).toBe('Hosted on Oracle');
    expect(hosting.confidence).toBe('observed');
  });

  it('the Cognisys case: a vendor RELATIONSHIP claim never conflicts with the probe\'s hosting fact', () => {
    const signals = [{ type: 'works_with', value: 'AWS', confidence: 'probable', claim_type: 'relationship' }];
    const recon = { cloud_provider: 'Oracle' };

    const result = buildInferences(signals, ['homepage'], 'https://cognisys.example', recon);
    const hosting = infra(result.inferences);
    const relationship = result.inferences.find((i) => i.inference_id.startsWith('inf_works_with_'));

    // Two true chips, no conflict.
    expect(hosting.label).toBe('Hosted on Oracle');
    expect(hosting.confidence).toBe('observed');
    expect(hosting.conflicted).toBe(false);
    expect(relationship.label).toBe('Works with AWS');
    expect(relationship.conflicted).toBe(false);
    // M6 (review 2026-08-25): works_with gets its own category — never
    // 'infrastructure', which the frontend buckets as a security signal.
    expect(relationship.category).toBe('relationship');
  });

  it('probe fact alone (no text-derived hosting claim): observed, not conflicted', () => {
    const result = buildInferences([], ['homepage'], 'https://example.com', { cloud_provider: 'Oracle' });
    const hosting = infra(result.inferences);
    expect(hosting.label).toBe('Hosted on Oracle');
    expect(hosting.confidence).toBe('observed');
    expect(hosting.conflicted).toBe(false);
    expect(hosting.conflict).toBeUndefined();
  });

  it('text-derived hosting claim alone (no probe): rendered at its own confidence, not conflicted', () => {
    const signals = [{ type: 'infrastructure', value: 'AWS', confidence: 'probable', claim_type: 'hosting' }];
    const result = buildInferences(signals, ['homepage'], 'https://example.com', {});
    const hosting = infra(result.inferences);
    expect(hosting.label).toBe('Hosted on AWS');
    expect(hosting.confidence).toBe('probable');
    expect(hosting.conflicted).toBe(false);
  });

  it('agreement (aliased spelling): probe and text-derived claim naming the same provider — no conflict, canonical label (review M7)', () => {
    const signals = [{ type: 'infrastructure', value: 'Amazon Web Services', confidence: 'probable', claim_type: 'hosting' }];
    const result = buildInferences(signals, ['homepage'], 'https://example.com', { cloud_provider: 'aws' });
    const hosting = infra(result.inferences);
    expect(hosting.conflicted).toBe(false);
    // Display always uses the canonical pretty name, never the raw/mis-cased probe value.
    expect(hosting.label).toBe('Hosted on AWS');
  });

  it('nothing known: no canned "Hosted on AWS" guess — honest omission', () => {
    const result = buildInferences([], ['homepage'], 'https://example.com', {});
    expect(infra(result.inferences)).toBeUndefined();
    expect(result.inferences.some((i) => i.label === 'Hosted on AWS')).toBe(false);
  });
});

describe('buildInferences — Oracle canonicalization (C1/C2, real probe shapes)', () => {
  it('real-shape agree case: probe raw org text + a matching text claim → NO conflict, clean canonical label', () => {
    // recon-ip.js's classifyHosting() falls back to the raw org string for
    // anything an ASN/org pattern didn't classify BEFORE the Oracle branch —
    // this is the exact raw shape a live probe hit produces for an org whose
    // ipapi.co org string reads "Oracle Corporation".
    const signals = [{ type: 'infrastructure', value: 'Oracle', confidence: 'probable', claim_type: 'hosting' }];
    const recon = { cloud_provider: null, hosting_provider: 'Oracle Corporation' };

    const result = buildInferences(signals, ['homepage'], 'https://example.com', recon);
    const hosting = infra(result.inferences);

    expect(hosting.conflicted).toBe(false);
    expect(hosting.conflict).toBeUndefined();
    expect(hosting.label).toBe('Hosted on Oracle');
    expect(hosting.confidence).toBe('observed');
  });

  it('real-shape true-conflict case: text explicit own-hosting AWS + probe raw Oracle org → conflicted, canonical witnesses', () => {
    const signals = [{ type: 'infrastructure', value: 'AWS', confidence: 'probable', claim_type: 'hosting' }];
    const recon = { cloud_provider: null, hosting_provider: 'Oracle Corporation' };

    const result = buildInferences(signals, ['homepage'], 'https://example.com', recon);
    const hosting = infra(result.inferences);

    expect(hosting.conflicted).toBe(true);
    // Both witnesses are named with their canonical pretty name — never the raw org string.
    expect(hosting.conflict).toEqual({ probe_says: 'Oracle', source_says: 'AWS' });
    expect(hosting.label).toBe('Hosted on Oracle');
  });

  it('raw-org-only fallback: no text claim → canonicalized label, not the raw org string', () => {
    const recon = { cloud_provider: null, hosting_provider: 'Oracle Corporation' };
    const result = buildInferences([], ['homepage'], 'https://example.com', recon);
    const hosting = infra(result.inferences);

    expect(hosting.label).toBe('Hosted on Oracle');
    expect(hosting.confidence).toBe('observed');
    expect(hosting.conflicted).toBe(false);
  });
});

describe('sameProvider / canonicalProviderLabel — the fuzzy fallback directly', () => {
  it('a raw probe org string matches a shorter text claim naming the same provider', () => {
    expect(sameProvider('Oracle Corporation', 'Oracle')).toBe(true);
    expect(sameProvider('Oracle', 'Oracle Corporation')).toBe(true);
  });

  it('genuinely different providers never match, even with raw org noise', () => {
    expect(sameProvider('Oracle Corporation', 'AWS')).toBe(false);
    expect(sameProvider('Amazon.com, Inc.', 'Azure')).toBe(false);
  });

  it('canonicalProviderLabel returns the pretty name for a raw org string, and the raw value for unknowns', () => {
    expect(canonicalProviderLabel('Oracle Corporation')).toBe('Oracle');
    expect(canonicalProviderLabel('aws')).toBe('AWS');
    expect(canonicalProviderLabel('DigitalOcean, LLC')).toBe('DigitalOcean, LLC');
  });
});

describe('buildInferences — correctable_fields.infrastructure precedence (M5)', () => {
  function infraField(result) {
    return result.correctable_fields.find((f) => f.key === 'infrastructure');
  }

  it('probe wins over a text-derived hosting claim and a CDN hint', () => {
    const signals = [{ type: 'infrastructure', value: 'AWS', confidence: 'probable', claim_type: 'hosting' }];
    const recon = { cloud_provider: 'Oracle', cdn_provider: 'Cloudflare' };
    const result = buildInferences(signals, ['homepage'], 'https://example.com', recon);
    expect(infraField(result).inferred_value).toBe('Oracle');
  });

  it('text-derived claim wins over a CDN hint when there is no probe fact', () => {
    const signals = [{ type: 'infrastructure', value: 'AWS', confidence: 'probable', claim_type: 'hosting' }];
    const recon = { cdn_provider: 'Cloudflare' };
    const result = buildInferences(signals, ['homepage'], 'https://example.com', recon);
    expect(infraField(result).inferred_value).toBe('AWS (probable)');
  });

  it('a CDN/edge hint surfaces honestly when neither probe nor text claim exist', () => {
    const recon = { cdn_provider: 'Cloudflare' };
    const result = buildInferences([], ['homepage'], 'https://example.com', recon);
    expect(infraField(result).inferred_value).toBe('Behind Cloudflare');
  });

  it('falls back to the honest "Unknown" when nothing is known at all', () => {
    const result = buildInferences([], ['homepage'], 'https://example.com', {});
    expect(infraField(result).inferred_value).toBe('Unknown');
  });
});

describe('buildInferences — label hygiene (item 3)', () => {
  it('does not double "product" when the extracted value already ends with it', () => {
    const result = buildInferences(
      [{ type: 'product_type', value: 'Software product', confidence: 'probable' }],
      ['homepage'], 'https://example.com', {},
    );
    const inf = result.inferences.find((i) => i.inference_id === 'inf_product_type');
    expect(inf.label).toBe('Software product');
    expect(inf.label).not.toMatch(/product product/i);
  });

  it('still appends "product" for values that need it', () => {
    const result = buildInferences(
      [{ type: 'product_type', value: 'B2B SaaS', confidence: 'probable' }],
      ['homepage'], 'https://example.com', {},
    );
    const inf = result.inferences.find((i) => i.inference_id === 'inf_product_type');
    expect(inf.label).toBe('B2B SaaS product');
  });

  it('every boolean signal type gets a human label — no bare "True" chip', () => {
    const boolTypes = [
      'handles_payments', 'uses_ai', 'handles_personal_data', 'pen_test_completed',
      'has_backup', 'aws_program_enrolled', 'microsoft_program_enrolled',
    ];
    // compliance_status is absent from these signals, so buildInferences also
    // adds its own default "Pre-SOC 2" inference — expected and unrelated to
    // the boolean labels under test, so filter to just the boolean chips.
    const signals = boolTypes.map((type) => ({ type, value: true, confidence: 'probable' }));
    const result = buildInferences(signals, ['homepage'], 'https://example.com', {});
    const boolInferences = result.inferences.filter((i) => boolTypes.includes(i.inference_id.replace('inf_', '')));

    expect(boolInferences).toHaveLength(boolTypes.length);
    for (const inf of boolInferences) {
      expect(typeof inf.label).toBe('string');
      expect(inf.label.trim().length).toBeGreaterThan(0);
      expect(inf.label).not.toMatch(/^true$/i);
    }
    expect(boolInferences.map((i) => i.label)).toEqual(
      expect.arrayContaining(['Handles payments', 'Uses AI', 'Handles personal data']),
    );
  });

  it('filters out any inference whose synthesized label is empty or a bare boolean', () => {
    // A signal type with no label mapping at all would otherwise fall through
    // to `signal.value` (the literal boolean `true`) — the exact bug closed.
    const signals = [{ type: 'unmapped_boolean_type', value: true, confidence: 'probable' }];
    const result = buildInferences(signals, ['homepage'], 'https://example.com', {});
    expect(result.inferences.some((i) => i.label === true || i.label === 'true')).toBe(false);
  });
});
