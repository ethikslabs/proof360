// partner-cers.js — DEMO-GRADE partner window (PROOF360-PARTNER-PORTAL-DEMO-001 slice).
//
// Serves the demo founder's CERs projected through the no-leak partner boundary
// (projectForViewer — the same function the unit suite proves), joined to the AWS co-sell
// book captured by the ace-bridge snapshot. proof360 makes NO call to Partner Central:
// the bridge is the single AWS-facing component and writes the snapshot; this handler
// only reads it. A missing/stale snapshot degrades honestly to records-without-book.
//
// Default-deny twice over: 404 unless DEMO_FOUNDER_MODE === 'true' (positive condition;
// absent fails closed), and only the demo founder's profile is ever read. The productized
// partner API (real auth, real tenancy) is PROOF360-CER-PARTNER-API-001 — it replaces
// this handler rather than extending it.
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import {
  getOrCreateActiveProfile,
  getOrCreateFounder,
  replayProfile,
} from '../services/memory-store.js';
import { cerProjection, projectForViewer } from '../services/cer-projection.js';
import { CER_ROUTES } from '../config/cer-routes.js';

const DEMO_SUB = 'demo-founder';

function snapshotPath() {
  return process.env.PORTFOLIO_SNAPSHOT_PATH
    || `${homedir()}/.ethikslabs/proof360/portfolio-snapshot.json`;
}

async function loadSnapshot() {
  try {
    return JSON.parse(await readFile(snapshotPath(), 'utf8'));
  } catch {
    return null; // honest degradation — records render, book does not
  }
}

// A CER carries its AWS opportunity as an evidence ref: aws-pc-<catalog>:<opportunityId>
function opportunityIdFrom(evidenceRefs = []) {
  const ref = evidenceRefs.find((r) => r.startsWith('aws-pc-') && !r.startsWith('aws-pc-engagement') && !r.startsWith('aws-pc-invitation'));
  return ref ? ref.split(':')[1] : null;
}

function gapFrom(cer) {
  if (cer.recommendation_id) return cer.recommendation_id;
  const ref = (cer.evidence_refs || []).find((r) => r.startsWith('proof360-gap:'));
  return ref ? ref.split(':')[1] : null;
}

// Shared gate + projection for every partner-window route. Returns null when the caller
// must be 404'd (demo mode off, or a partner id that owns no route).
async function visibleFor(partner) {
  if (process.env.DEMO_FOUNDER_MODE !== 'true') return null;
  const knownPartners = new Set(Object.values(CER_ROUTES).map((r) => r.partner));
  if (!knownPartners.has(partner)) return null;
  const founder = await getOrCreateFounder({ sub: DEMO_SUB });
  const profile = await getOrCreateActiveProfile(founder);
  const cers = cerProjection(await replayProfile(profile.id));
  return projectForViewer(cers, { audience: 'partner', partner });
}

function enrich(c, snapshot) {
  const byOppId = new Map((snapshot?.opportunities || []).map((o) => [o.id, o]));
  const companies = snapshot?.companies || {};
  const oppId = opportunityIdFrom(c.evidence_refs);
  const opportunity = oppId ? byOppId.get(oppId) || null : null;
  const company = companies[c.company_id] || null;
  return {
    cer_id: c.cer_id,
    route: c.route,
    label: c.label,
    status: c.status,
    consent_state: c.consent_state,
    created_at: c.created_at,
    updated_at: c.updated_at,
    gap: gapFrom(c),
    evidence_refs: c.evidence_refs,
    event_count: (c.events || []).length,
    customer: company
      ? { name: company.name, industry: company.industry, country: company.country, domain: company.domain }
      : (opportunity ? { name: opportunity.company_name, industry: opportunity.industry, country: opportunity.country } : null),
    opportunity,
  };
}

// GET /api/v1/partner/:partner/cers/:cerId — one record, with its event trail.
// A cerId not routed to this partner 404s exactly like a nonexistent one: no existence
// leak across the partner boundary.
export async function partnerCerDetailHandler(request, reply) {
  const { partner, cerId } = request.params;
  const visible = await visibleFor(partner);
  if (!visible) return reply.status(404).send({ error: 'not_found' });

  const cer = visible.find((c) => c.cer_id === cerId);
  if (!cer) return reply.status(404).send({ error: 'not_found' });

  const snapshot = await loadSnapshot();
  // Sibling routes: the rest of THIS customer's engagements that this same partner may
  // see — the rail, partner-scoped. Never other partners' routes.
  const siblings = visible
    .filter((c) => c.cer_id !== cerId && c.company_id === cer.company_id)
    .map((c) => ({ cer_id: c.cer_id, label: c.label, status: c.status, route: c.route }));

  return reply.send({
    partner,
    demo: true,
    record: { ...enrich(cer, snapshot), events: cer.events || [], visibility_policy: cer.visibility_policy },
    siblings,
  });
}

// GET /api/v1/partner/:partner/cers
export async function partnerCersListHandler(request, reply) {
  const { partner } = request.params;
  const visible = await visibleFor(partner);
  if (!visible) return reply.status(404).send({ error: 'not_found' });

  const snapshot = await loadSnapshot();
  const engagements = visible.map((c) => enrich(c, snapshot));

  // The un-bitten line (canon 2026-07-17): opportunities in the book with no consented
  // record render AGGREGATE ONLY — never named. Scoped to partners who carry an AWS route.
  const partnerHasAwsRoute = Object.entries(CER_ROUTES)
    .some(([key, cfg]) => cfg.partner === partner && key.includes('aws'));
  const consentedOppIds = new Set(engagements.map((e) => e.opportunity?.id).filter(Boolean));
  const unbitten = partnerHasAwsRoute
    ? (snapshot?.opportunities || []).filter((o) => !consentedOppIds.has(o.id))
    : [];

  return reply.send({
    partner,
    demo: true,
    captured_at: snapshot?.captured_at || null,
    catalog: snapshot?.catalog || null,
    engagements,
    book: {
      total: snapshot?.opportunities?.length || 0,
      consented: engagements.filter((e) => e.opportunity).length,
      unbitten: unbitten.length,
      unbitten_monthly_value: unbitten.reduce((s, o) => s + (o.amount || 0), 0),
      currency: unbitten[0]?.currency || 'USD',
    },
  });
}
