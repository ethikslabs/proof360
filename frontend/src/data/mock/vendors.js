export function getMockVendors() {
  return [
    { id: 'v1', name: 'Basic MFA / identity controls', category: 'identity', timing: 'now', reason: 'Digital orders and supplier records need access controls from day one. Compromised access is a supply-chain risk.', routeability: 'self_serve', regionFit: 'AU', status: 'suggested' },
    { id: 'v2', name: 'Supply chain insurance', category: 'insurance', timing: 'now', reason: 'Hospitals and export buyers will ask about your insurance posture. A broker conversation is free.', routeability: 'ethiks', regionFit: 'AU', status: 'suggested' },
    { id: 'v3', name: 'Supplier documentation template', category: 'compliance_evidence', timing: 'soon', reason: 'A lightweight supplier agreement and origin attestation creates the paper trail investors and enterprise buyers need.', routeability: 'self_serve', regionFit: 'AU', status: 'suggested' },
    { id: 'v4', name: 'Vanta (compliance automation)', category: 'compliance_evidence', timing: 'later', reason: 'When digital infrastructure grows and enterprise accounts are in play. Overkill now — but understand the path.', routeability: 'ethiks', regionFit: 'AU/APAC', status: 'suggested' },
    { id: 'v5', name: 'Okta (enterprise identity)', category: 'identity', timing: 'later', reason: 'When the team grows and multiple systems need governed access. Duo or Google Workspace is enough now.', routeability: 'partner', regionFit: 'Global', status: 'suggested' },
  ];
}
