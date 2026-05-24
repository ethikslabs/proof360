import { VENDORS } from '../config/vendors.js';

// Maps vendor_id prefix to the CORPUS layer slug (e.g. 'cisco_duo' → 'cisco')
function baseVendorName(vendorId) {
  return vendorId.split('_')[0];
}

// Select vendors that close confirmed gaps, assign priority.
// vendorSlugsByGap: gap_id → Set of vendor base names confirmed by CORPUS semantic search.
export function selectVendors(gaps, vendorSlugsByGap = {}) {
  const gapIds = new Set(gaps.map((g) => g.gap_id));
  const gapSeverities = {};
  for (const gap of gaps) {
    gapSeverities[gap.gap_id] = gap.severity;
  }

  const matched = [];

  for (const vendor of Object.values(VENDORS)) {
    const closesGaps = vendor.closes.filter((gapId) => gapIds.has(gapId));
    if (closesGaps.length === 0) continue;

    const base = baseVendorName(vendor.id);
    const corpusConfirmed = closesGaps.some((gapId) => vendorSlugsByGap[gapId]?.has(base));

    const closesCritical = closesGaps.some((id) => gapSeverities[id] === 'critical');
    const closesHigh = closesGaps.some((id) => gapSeverities[id] === 'moderate');
    const priority = closesCritical ? 'start_here' : closesHigh ? 'recommended' : 'optional';

    matched.push({
      vendor_id: vendor.id,
      display_name: vendor.display_name,
      closes_gaps: closesGaps,
      cost_range: vendor.cost_range,
      timeline: vendor.timeline,
      priority,
      is_partner: vendor.is_partner,
      deal_label: vendor.deal_label,
      referral_url: vendor.referral_url,
      corpus_confirmed: corpusConfirmed,
    });
  }

  // Sort: tier first (start_here → recommended → optional),
  // then CORPUS-confirmed vendors rank above unconfirmed within the same tier.
  const order = { start_here: 0, recommended: 1, optional: 2 };
  matched.sort((a, b) => {
    const tierDiff = order[a.priority] - order[b.priority];
    if (tierDiff !== 0) return tierDiff;
    return (b.corpus_confirmed ? 1 : 0) - (a.corpus_confirmed ? 1 : 0);
  });

  return matched;
}
