import { VENDORS, VENDOR_CATEGORIES } from '../config/vendors.js';

// Build vendor_intelligence object per gap, matching brief-vendors.md shape
export function buildVendorIntelligence(gap, context) {
  const category = gapToCategory(gap.gap_id);
  if (!category) return null;

  const categoryConfig = VENDOR_CATEGORIES[category.name];
  if (!categoryConfig) return null;

  // Find vendors that close this gap
  const relevantVendors = Object.values(VENDORS).filter((v) =>
    v.closes.includes(gap.gap_id)
  );
  if (relevantVendors.length === 0) return null;

  // Pick the best vendor for this context
  const pick = selectPick(relevantVendors, gap, context);

  // Build vendor entries with quadrant positions
  const vendors = relevantVendors.map((v) => {
    const pos = categoryConfig.vendor_positions?.[v.id] || { x: 0.5, y: 0.5 };
    return {
      vendor_id: v.id,
      display_name: v.display_name,
      initials: v.initials,
      x: pos.x,
      y: pos.y,
      is_partner: v.is_partner,
      is_pick: v.id === pick.vendor_id,
      deal_label: v.deal_label,
      best_for: v.best_for,
      summary: v.summary,
      referral_url: v.is_partner ? v.referral_url : null,
    };
  });

  // Build disclosure
  const partnerNames = relevantVendors
    .filter((v) => v.is_partner)
    .map((v) => v.display_name);
  const disclosure = partnerNames.length > 0
    ? `We use ${partnerNames.join(' and ')} ourselves. Proof360 has a referral arrangement with these partners — we earn a small commission when you sign up through us, and you get a discount. We would recommend them either way.`
    : 'Proof360 has no referral arrangement with any vendor listed here. These are independent recommendations.';

  return {
    category_name: category.name,
    quadrant_axes: categoryConfig.quadrant_axes,
    vendors,
    pick: buildPickCard(pick, gap, context),
    disclosure,
  };
}

function gapToCategory(gapId) {
  const map = {
    soc2: { name: 'GRC & compliance automation' },
    incident_response: { name: 'GRC & compliance automation' },
    mfa: { name: 'Identity & IAM' },
    sso: { name: 'Identity & IAM' },
    cyber_insurance: null, // No quadrant for insurance
    edr: null, // Would need an infrastructure security category
    vendor_questionnaire: null,
  };
  return map[gapId] || null;
}

function selectPick(vendors, gap, context) {
  // Prefer partner vendors, then by best_for match
  const partners = vendors.filter((v) => v.is_partner);
  if (partners.length > 0) return partners[0];
  return vendors[0];
}

function buildPickCard(vendor, gap, context) {
  const stageContext = context.stage
    ? `${context.stage} stage`
    : 'Early stage';
  const infraContext = context.infrastructure
    ? ` · ${context.infrastructure} stack`
    : '';

  return {
    vendor_id: vendor.id,
    stage_context: stageContext + infraContext,
    recommendation_headline: vendor.display_name,
    recommendation_body: generateRecommendation(vendor, gap),
    meta: {
      time_to_close: vendor.timeline,
      covers: vendor.closes.join(', ').toUpperCase().replace(/_/g, ' '),
      best_for: vendor.best_for,
      what_wed_do_differently: 'Start evidence collection earlier',
    },
    cta_label: `Start with ${vendor.display_name}`,
    deal_label: vendor.deal_label
      ? `${vendor.deal_label} through Proof360`
      : null,
    referral_url: vendor.is_partner ? vendor.referral_url : null,
  };
}

function generateRecommendation(vendor, gap) {
  const recs = {
    vanta: `We use Vanta ourselves — Proof360's own SOC 2 readiness runs on it. It connected to our AWS stack in an afternoon and had us audit-ready in 6 weeks. For a seed-stage company closing its first enterprise deal, it's the fastest path from gap to proof.`,
    drata: `Drata gives you more customisation and handles complex environments well. We use it alongside Vanta for broader framework coverage. If you're Series B or beyond with a larger team, it's worth the longer setup.`,
    okta: `Okta is the industry standard for enterprise identity. Broad integrations, strong admin controls. If your buyers expect SSO, this is the straightforward path.`,
    cisco_duo: `Duo is the fastest way to get MFA rolled out. We've seen teams go from zero to fully deployed in a day. Lightweight, startup-friendly, and it just works.`,
  };
  return recs[vendor.id] || `${vendor.display_name} is a solid option for closing this gap. ${vendor.summary}`;
}
