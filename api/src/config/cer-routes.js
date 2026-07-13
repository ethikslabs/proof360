// The four v1 CER pathways. Same object shape for every one — that sameness IS the
// product thesis (AWS is just one proof of the pattern). Later this becomes route
// config / CORPUS seed; for v1 it is hardcoded seed data.
//
// `partner` is who a CER on this route MAY be shared with "later" (no partner login
// exists in v1). It is declared now so the no-leak projection can be proven correct
// before any partner can ever log in.

// `external_action` — the "extend CER" seam (John 2026-07-13): the real next step a confirmed CER
// routes to. `target: null` is provisioned per-customer/deal at engage time (a CPPO private-offer
// link minted per customer; a referral form opened per founder) — never hardcoded here. Frontend
// projection: frontend/src/utils/cerPathways.js. The engage handler is the remaining /chat build.
export const CER_ROUTES = {
  ingram_micro_aws: {
    pathway_type: 'cloud_program',
    label: 'AWS pathway via Ingram Micro',
    cta_label: 'Start AWS pathway',
    partner: 'ingram_micro',
    external_action: { kind: 'marketplace_offer', label: 'Open AWS Marketplace private offer', target: null },
  },
  austbrokers_cyberpro: {
    pathway_type: 'cyber_insurance_referral',
    label: 'Cyber insurance pathway',
    cta_label: 'Check cyber insurance pathway',
    partner: 'austbrokers_cyberpro',
    external_action: { kind: 'referral_form', label: 'Request CyberPro quote', target: null },
  },
  vanta: {
    pathway_type: 'compliance_security',
    label: 'Compliance pathway',
    cta_label: 'Review compliance pathway',
    partner: 'vanta',
    external_action: { kind: 'marketplace_offer', label: 'Open Vanta on AWS Marketplace', target: null },
  },
  ingram_micro_cisco: {
    pathway_type: 'distributor_product',
    label: 'Cisco pathway via Ingram Micro',
    cta_label: 'Request Cisco pathway',
    partner: 'ingram_micro',
    external_action: { kind: 'distributor_quote', label: 'Request Cisco quote via Ingram', target: null },
  },
};

// The visibility policy stored on a CER. Founder + Ethiks360 admin always; the named
// partner is future ("later, if permissioned"). Permission is enforced at read time by
// projectForViewer — never rendered-then-hidden.
export function visibilityPolicyForRoute(route) {
  const cfg = CER_ROUTES[route];
  if (!cfg) throw new Error(`unknown_cer_route:${route}`);
  return {
    route,
    partner: cfg.partner,
    allowed_audiences: ['founder', 'ethiks360_admin', `partner:${cfg.partner}`],
  };
}
