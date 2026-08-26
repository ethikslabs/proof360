// John logged in as his own account and opened Settings (2026-08-26). It showed
// him: "Your company · Founder · Free", an AWS Activate application under review
// for $10k of credits, Microsoft for Startups active with $1,000 of Azure credits,
// a Vanta subscription bought through proof360 renewing 14 Jun 2026, a cyber
// insurance quote pending with Austbrokers, and an AWS Console integration
// connected to us-east-1 and ap-southeast-2.
//
// None of it was his. The file says so plainly: `// ── Mock data — demo founder
// profile ──`, and every section read from that constant regardless of who was
// signed in.
//
// A fabricated token count is bad. A fabricated ACCOUNT is worse: it states
// commercial relationships that do not exist, to the person they supposedly
// belong to. Same rule, applied harder — show what is real, and where there is no
// source, show nothing.
//
// The good news is that "programs you've applied for through proof360" already
// has a true answer: the pathways the founder actually kept.
import { describe, it, expect } from 'vitest';
import { deriveAccount } from '../../src/rendering/account.js';

const USER = { name: 'John Coates', email: 'johnpcoates@gmail.com' };

const MOVES = [
  { cer_id: 'm1', route: 'ingram_micro_aws', label: 'AWS pathway via Ingram Micro',
    item: { title: 'AWS Well-Architected Partner Program', category: 'program' },
    cta: { label: 'Book a conversation', url: 'https://example.com/book' },
    admin_status: 'Submitted', consent_state: 'granted' },
  { cer_id: 'm2', route: 'vanta', label: 'Compliance via Vanta',
    item: { title: 'Vanta', category: 'vendor' },
    admin_status: 'Submitted', consent_state: 'withdrawn' },
];

describe('deriveAccount — the account is the founder’s, or it is nothing', () => {
  it('names the person actually signed in', () => {
    const a = deriveAccount({ user: USER, moves: [] });
    expect(a.name).toBe('John Coates');
    expect(a.email).toBe('johnpcoates@gmail.com');
  });

  it('falls back to the email when there is no name, never to a stand-in company', () => {
    const a = deriveAccount({ user: { email: 'x@y.com' }, moves: [] });
    expect(a.name).toBe('x@y.com');
    expect(a.name).not.toMatch(/your company/i);
  });

  it('derives initials from the real identity', () => {
    expect(deriveAccount({ user: USER, moves: [] }).initials).toBe('JC');
  });

  // The true answer to "programs you've applied for through proof360".
  it('lists the pathways the founder actually kept', () => {
    const a = deriveAccount({ user: USER, moves: MOVES });
    expect(a.programs.map((p) => p.name)).toEqual([
      'AWS Well-Architected Partner Program', 'Vanta',
    ]);
  });

  it('carries the real action where the route has one, and none where it does not', () => {
    const a = deriveAccount({ user: USER, moves: MOVES });
    expect(a.programs[0].action).toEqual({ label: 'Book a conversation', url: 'https://example.com/book' });
    expect(a.programs[1].action).toBeNull();
  });

  it('shows consent honestly — a withdrawn pathway is not an active one', () => {
    const a = deriveAccount({ user: USER, moves: MOVES });
    expect(a.programs[0].status).toBe('active');
    expect(a.programs[1].status).toBe('withdrawn');
  });

  it('invents no credits, no renewals, no dollar figures', () => {
    const blob = JSON.stringify(deriveAccount({ user: USER, moves: MOVES }));
    expect(blob).not.toMatch(/\$\d/);
    expect(blob).not.toMatch(/renews/i);
    expect(blob).not.toMatch(/under review/i);
  });

  // Purchases, Integrations and Billing have no data source at all. A section
  // that cannot be filled truthfully does not appear — an empty Billing tab is
  // honest, a fabricated Vanta renewal is not.
  it('offers only the sections it can fill from real data', () => {
    const a = deriveAccount({ user: USER, moves: MOVES });
    expect(a.sections).toContain('programs');
    expect(a.sections).not.toContain('purchases');
    expect(a.sections).not.toContain('integrations');
    expect(a.sections).not.toContain('billing');
  });

  it('says nothing rather than something when the founder has kept nothing', () => {
    const a = deriveAccount({ user: USER, moves: [] });
    expect(a.programs).toEqual([]);
    expect(a.sections).not.toContain('programs');
  });

  it('survives junk without inventing an account', () => {
    expect(deriveAccount({ user: null, moves: null }).name).toBeNull();
    expect(deriveAccount({}).programs).toEqual([]);
    expect(deriveAccount().sections).toEqual([]);
    expect(deriveAccount({ user: USER, moves: [{ nope: true }] }).programs).toEqual([]);
  });
});
