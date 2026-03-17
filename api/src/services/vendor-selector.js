import { VENDORS } from '../config/vendors.js';

// Select vendors that close confirmed gaps, assign priority
export function selectVendors(gaps) {
  const gapIds = new Set(gaps.map((g) => g.gap_id));
  const gapSeverities = {};
  for (const gap of gaps) {
    gapSeverities[gap.gap_id] = gap.severity;
  }

  const matched = [];

  for (const vendor of Object.values(VENDORS)) {
    const closesGaps = vendor.closes.filter((gapId) => gapIds.has(gapId));
    if (closesGaps.length === 0) continue;

    // Priority: closes a critical gap = start_here, high = recommended, else optional
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
    });
  }

  // Sort: start_here first, then recommended, then optional
  const order = { start_here: 0, recommended: 1, optional: 2 };
  matched.sort((a, b) => order[a.priority] - order[b.priority]);

  return matched;
}
