// frontend/src/data/mock/vendors.js

const VENDOR_CATALOG = [
  {
    id: 'v1', name: 'Vanta',
    category: 'compliance_evidence',
    timing: 'now',
    synthesis: 'SOC 2 — the cert that unlocks B2B deals',
    signal_ids: ['no_soc2_detected', 'no_ir_controls', 'au_healthcare_enterprise'],
    routeability: 'ethiks', regionFit: 'AU',
  },
  {
    id: 'v2', name: 'AWS',
    category: 'cloud',
    timing: 'now',
    synthesis: '$220k+ in credits — most founders claim a fraction',
    signal_ids: ['seed_stage'],
    routeability: 'self_serve', regionFit: 'Global',
  },
  {
    id: 'v3', name: 'Microsoft',
    category: 'cloud',
    timing: 'soon',
    synthesis: 'Sell into enterprise through the Microsoft channel',
    signal_ids: ['au_healthcare_enterprise', 'seed_stage'],
    routeability: 'partner', regionFit: 'Global',
  },
  {
    id: 'v4', name: 'Cisco',
    category: 'security',
    timing: 'soon',
    synthesis: 'Security stack enterprise buyers recognise on sight',
    signal_ids: ['no_ir_controls', 'au_healthcare_enterprise'],
    routeability: 'partner', regionFit: 'AU',
  },
  {
    id: 'v5', name: 'Cloudflare',
    category: 'security',
    timing: 'now',
    synthesis: 'Edge security — already active on your domain',
    signal_ids: ['cloudflare_active'],
    routeability: 'self_serve', regionFit: 'Global',
  },
];

export function rankVendorsBySignals(activeSignals = []) {
  const activeIds = new Set(activeSignals.map(s => s.id));
  return VENDOR_CATALOG
    .map(v => {
      const matchedSignals = (v.signal_ids || []).filter(id => activeIds.has(id));
      const matchedValues = matchedSignals
        .map(id => activeSignals.find(s => s.id === id)?.value)
        .filter(Boolean);
      return {
        ...v,
        signalCount: matchedSignals.length,
        reasonLine: matchedValues.length > 0
          ? `Ranked because: ${matchedValues.join(' · ')}`
          : null,
      };
    })
    .sort((a, b) => b.signalCount - a.signalCount);
}

export function getMockVendors() {
  return VENDOR_CATALOG;
}
