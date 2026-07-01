import { describe, it, expect } from 'vitest';
import {
  routeFromText,
  cerBuildFields,
  cerMeter,
  agencyReady,
  visibilityRows,
  buildProposal,
  PATHWAYS,
} from '../../src/utils/cerPathways.js';

describe('routeFromText — pathway intent detection', () => {
  it('maps cloud/AWS talk to the AWS route', () => {
    expect(routeFromText('we are burning a lot on cloud spend on AWS')).toBe('ingram_micro_aws');
    expect(routeFromText('our EC2 bill is out of control')).toBe('ingram_micro_aws');
  });
  it('maps compliance talk to Vanta', () => {
    expect(routeFromText('a customer asked for our SOC 2')).toBe('vanta');
    expect(routeFromText('we have a security questionnaire to fill')).toBe('vanta');
  });
  it('maps insurance talk to Austbrokers, Cisco talk to Cisco', () => {
    expect(routeFromText('do we need cyber insurance?')).toBe('austbrokers_cyberpro');
    expect(routeFromText('looking at Cisco Meraki for the office')).toBe('ingram_micro_cisco');
  });
  it('returns null when no pathway is implied', () => {
    expect(routeFromText('how do investors think about our team?')).toBeNull();
    expect(routeFromText('')).toBeNull();
  });
});

describe('cerBuildFields + meter', () => {
  it('ticks known fields and leaves unknowns waiting; proposed route shows a "?"', () => {
    const fields = cerBuildFields({
      route: 'ingram_micro_aws',
      companyName: 'Acme Robotics',
      contactName: 'Dana O.',
      need: 'cloud spend',
      evidenceRefs: ['e1'],
      routeConfirmed: false,
    });
    const byKey = Object.fromEntries(fields.map((f) => [f.key, f]));
    expect(byKey.company.state).toBe('done');
    expect(byKey.route.state).toBe('live');
    expect(byKey.route.value).toBe('ingram_micro_aws?');
    expect(byKey.consent.state).toBe('wait');
    expect(byKey.visibility.value).toBe('Ingram Micro');
    expect(cerMeter(fields)).toBe(5); // company, contact, need, evidence, visibility
  });

  it('a confirmed route ticks route done', () => {
    const fields = cerBuildFields({ route: 'vanta', companyName: 'X', contactName: 'Y', need: 'soc2', evidenceRefs: ['e'], routeConfirmed: true });
    expect(Object.fromEntries(fields.map((f) => [f.key, f])).route.state).toBe('done');
  });
});

describe('agencyReady', () => {
  it('is ready when all-but-consent are done and route confirmed', () => {
    const ready = cerBuildFields({ route: 'ingram_micro_aws', companyName: 'A', contactName: 'B', need: 'n', evidenceRefs: ['e'], routeConfirmed: true });
    expect(agencyReady(ready)).toBe(true);
  });
  it('is not ready while the route is only proposed', () => {
    const proposed = cerBuildFields({ route: 'ingram_micro_aws', companyName: 'A', contactName: 'B', need: 'n', evidenceRefs: ['e'], routeConfirmed: false });
    expect(agencyReady(proposed)).toBe(false);
  });
  it('is not ready once consent is granted', () => {
    const done = cerBuildFields({ route: 'ingram_micro_aws', companyName: 'A', contactName: 'B', need: 'n', evidenceRefs: ['e'], routeConfirmed: true, consented: true });
    expect(agencyReady(done)).toBe(false);
  });
  it('is ready even when contact is missing — contact is context, not a hard gate', () => {
    const noContact = cerBuildFields({ route: 'ingram_micro_aws', companyName: 'A', contactName: null, need: 'n', evidenceRefs: ['e'], routeConfirmed: true });
    expect(agencyReady(noContact)).toBe(true);
  });
});

describe('visibilityRows — no-leak framing', () => {
  it('shows the route partner as later, all OTHER partners as never', () => {
    const rows = visibilityRows('ingram_micro_aws');
    const never = rows.find((r) => r.tone === 'never').who;
    expect(never).toContain('Vanta');
    expect(never).toContain('Austbrokers CyberPro');
    expect(never).not.toContain('Ingram Micro'); // the route's own partner is "later", not "never"
    expect(rows.find((r) => r.tone === 'later').who).toBe('Ingram Micro');
  });
});

describe('buildProposal', () => {
  it('assembles the agency-card proposal from route + context', () => {
    const p = buildProposal({ route: 'ingram_micro_aws', companyName: 'Acme', need: 'cloud spend', evidenceRefs: ['cloud_invoice.pdf'] });
    expect(p.pathwayLabel).toBe(PATHWAYS.ingram_micro_aws.label);
    expect(p.route).toBe('ingram_micro_aws');
    expect(p.evidence).toEqual(['cloud_invoice.pdf']);
    expect(p.visibility).toHaveLength(3);
  });
});

import { FIELD_LENS, firstMissingGate, awaitedCapture } from '../../src/utils/cerPathways.js';

describe('firstMissingGate', () => {
  const fields = (overrides) => ([
    { key: 'company', state: 'done' }, { key: 'contact', state: 'done' },
    { key: 'need', state: 'done' }, { key: 'route', state: 'done' },
    { key: 'consent', state: 'wait' }, { key: 'visibility', state: 'done' },
  ].map((f) => ({ ...f, ...(overrides[f.key] ? { state: overrides[f.key] } : {}) })));

  it('returns the company lens entry when company is missing', () => {
    const g = firstMissingGate(fields({ company: 'wait' }));
    expect(g.field).toBe('company');
    expect(g.persona).toBe('sofia');
    expect(g.prompt).toMatch(/company/i);
    expect(g.factField).toBe('company_name');
    expect(g.profileKey).toBe('name');
  });

  it('prompts for company (the only capturable gate), never for contact/need', () => {
    expect(firstMissingGate(fields({ company: 'wait', contact: 'wait' })).field).toBe('company');
    // contact/need have no capture path, so a contact-only gap must NOT produce a prompt.
    expect(firstMissingGate(fields({ contact: 'wait' }))).toBeNull();
  });

  it('returns null when all promptable gates are present (consent is not promptable)', () => {
    expect(firstMissingGate(fields({}))).toBeNull();
  });
});

describe('awaitedCapture', () => {
  it('returns a url handoff when the caller flags the reply as a URL', () => {
    expect(awaitedCapture('company', 'https://foo.io', true).kind).toBe('url');
    expect(awaitedCapture('company', 'northwind.io', true).kind).toBe('url');
  });
  it('treats a non-URL reply as the field value with its fact mapping', () => {
    const c = awaitedCapture('company', '  Acme Robotics ', false);
    expect(c).toMatchObject({ kind: 'value', field: 'company', value: 'Acme Robotics', factField: 'company_name', profileKey: 'name' });
  });
});
