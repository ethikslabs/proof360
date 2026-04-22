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
      distributor: v.distributor,
      deal_label: v.deal_label,
      best_for: v.best_for,
      summary: v.summary,
      referral_url: v.is_partner ? v.referral_url : null,
      marketplace_aws: v.marketplace_aws || false,
      aws_native: v.aws_native || false,
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
    soc2:               { name: 'GRC & compliance automation' },
    incident_response:  { name: 'GRC & compliance automation' },
    compliance:         { name: 'GRC & compliance automation' },
    pci_dss:            { name: 'GRC & compliance automation' },
    hipaa_security:     { name: 'GRC & compliance automation' },
    apra_prudential:    { name: 'GRC & compliance automation' },
    essential_eight:    { name: 'GRC & compliance automation' },
    founder_trust:      { name: 'Founder trust' },
    mfa:                { name: 'Identity & IAM' },
    sso:                { name: 'Identity & IAM' },
    identity:           { name: 'Identity & IAM' },
    edr:                { name: 'Endpoint protection' },
    endpoint_protection:{ name: 'Endpoint protection' },
    network_perimeter:  { name: 'Network security' },
    firewall:           { name: 'Network security' },
    zero_trust:         { name: 'Network security' },
    waf:                { name: 'Network security' },
    dmarc:              { name: 'Network security' },
    spf:                { name: 'Network security' },
    security_headers:   { name: 'Network security' },
    tls_configuration:  { name: 'Network security' },
    backup:             { name: 'Data resilience' },
    recovery:           { name: 'Data resilience' },
    data_resilience:    { name: 'Data resilience' },
    cyber_insurance:    null,
    vendor_questionnaire: null,
  };
  return map[gapId] || null;
}

function selectPick(vendors, gap, context) {
  const isAWS = context.cloud_provider === 'AWS';

  if (isAWS) {
    // On AWS: native tools first, then Marketplace-listed partners, then any partner
    const awsNative = vendors.filter((v) => v.aws_native);
    if (awsNative.length > 0) return awsNative[0];
    const marketplacePartners = vendors.filter((v) => v.is_partner && v.marketplace_aws);
    if (marketplacePartners.length > 0) return marketplacePartners[0];
  }

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

  // Detect if they already use this vendor — recon-confirmed, not inferred
  const alreadyUsing = isVendorAlreadyInUse(vendor, context);
  const awsMarketplace = !alreadyUsing && context.cloud_provider === 'AWS' && vendor.marketplace_aws;
  const awsNative = vendor.aws_native || false;
  const marketplaceLabel = awsMarketplace ? ' · AWS Marketplace' : '';
  const activateNote = awsNative
    ? 'Included in AWS — no additional license cost.'
    : awsMarketplace
      ? 'Available on AWS Marketplace — purchase against your AWS commitment or AWS Activate credits.'
      : null;

  return {
    vendor_id: vendor.id,
    stage_context: stageContext + infraContext + marketplaceLabel,
    marketplace_aws: awsMarketplace || false,
    activate_note: activateNote,
    recommendation_headline: vendor.display_name,
    recommendation_body: alreadyUsing
      ? generateAlreadyUsingRec(vendor, gap)
      : generateRecommendation(vendor, gap),
    already_using: alreadyUsing,
    meta: {
      time_to_close: vendor.timeline,
      covers: vendor.closes.join(', ').toUpperCase().replace(/_/g, ' '),
      best_for: vendor.best_for,
      what_wed_do_differently: 'Start evidence collection earlier',
    },
    cta_label: alreadyUsing ? `Configure in ${vendor.display_name}` : `Start with ${vendor.display_name}`,
    deal_label: !alreadyUsing && vendor.deal_label
      ? `${vendor.deal_label} through Proof360`
      : null,
    referral_url: !alreadyUsing && vendor.is_partner ? vendor.referral_url : null,
  };
}

function isVendorAlreadyInUse(vendor, context) {
  if (vendor.id === 'cloudflare') {
    return !!(context.cdn_provider === 'Cloudflare' || context.waf_detected?.includes('Cloudflare'));
  }
  if (vendor.id === 'aws') {
    return context.cloud_provider === 'AWS';
  }
  return false;
}

function generateAlreadyUsingRec(vendor, gap) {
  const recs = {
    cloudflare: `You're already on Cloudflare — this gap is a configuration issue, not a product decision. The fix is in your Cloudflare dashboard, not a new signup.`,
  };
  return recs[vendor.id] || `You already use ${vendor.display_name}. This gap can be closed through your existing account — no new product needed.`;
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
