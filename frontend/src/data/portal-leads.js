export const TENANTS = {
  ethikslabs: {
    name: 'EthiksLabs',
    short: 'EL',
    domain: 'ethiks360.com',
    color: '#00d9b8',
    bg: 'rgba(0,217,184,0.1)',
    role: 'distributor',
    tagline: 'Platform Admin · All leads',
    vendors: Object.keys({}).concat(['crowdstrike','trellix','trendmicro','sophos','vanta','drata','secureframe','trustwave','okta','cisco_duo','microsoft','rsa','palo_alto','fortinet','cloudflare','sonicwall','veeam','cohesity','veritas','netapp','proofpoint','opentext','keeper','jamf','nutanix']),
  },
  ingram: {
    name: 'Ingram Micro',
    short: 'IM',
    domain: 'ingrammicro.com',
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.12)',
    role: 'distributor',
    tagline: 'AU Distributor · Full catalog view',
    vendors: ['trellix','sophos','fortinet','palo_alto','cohesity','nutanix','proofpoint','blancco','keeper','jamf'],
  },
  dicker: {
    name: 'Dicker Data',
    short: 'DD',
    domain: 'dickerdata.com.au',
    color: '#f43f5e',
    bg: 'rgba(244,63,94,0.12)',
    role: 'distributor',
    tagline: 'AU Distributor · Full catalog view',
    vendors: ['crowdstrike','trendmicro','cloudflare','sonicwall','veeam','veritas','microsoft','cisco_duo','rsa','trustwave','netapp','opentext'],
  },
  crowdstrike: {
    name: 'CrowdStrike',
    short: 'CS',
    domain: 'crowdstrike.com',
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.12)',
    role: 'vendor',
    tagline: 'Endpoint Security',
    vendors: ['crowdstrike'],
  },
  palo_alto: {
    name: 'Palo Alto Networks',
    short: 'PA',
    domain: 'paloaltonetworks.com',
    color: '#f97316',
    bg: 'rgba(249,115,22,0.12)',
    role: 'vendor',
    tagline: 'Network Security',
    vendors: ['palo_alto'],
  },
  cloudflare: {
    name: 'Cloudflare',
    short: 'CF',
    domain: 'cloudflare.com',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.12)',
    role: 'vendor',
    tagline: 'Network & Zero Trust',
    vendors: ['cloudflare'],
  },
};

const GAP_VENDOR_MAP = {
  edr:               ['crowdstrike','trellix','trendmicro','sophos'],
  endpoint_protection:['crowdstrike','trellix','trendmicro','sophos'],
  soc2:              ['vanta','drata','secureframe','trustwave'],
  mfa:               ['okta','cisco_duo','microsoft','rsa'],
  sso:               ['okta','microsoft'],
  identity:          ['okta','microsoft','cisco_duo'],
  network_perimeter: ['palo_alto','fortinet','cloudflare','sonicwall'],
  zero_trust:        ['palo_alto','cloudflare'],
  firewall:          ['palo_alto','fortinet','sonicwall'],
  backup:            ['veeam','cohesity','veritas','netapp'],
  email_security:    ['proofpoint','trendmicro','opentext'],
};

const VENDOR_NAMES = {
  crowdstrike: 'CrowdStrike', trellix: 'Trellix', trendmicro: 'Trend Micro', sophos: 'Sophos',
  vanta: 'Vanta', drata: 'Drata', secureframe: 'Secureframe', trustwave: 'Trustwave',
  okta: 'Okta', cisco_duo: 'Cisco Duo', microsoft: 'Microsoft Entra', rsa: 'RSA',
  palo_alto: 'Palo Alto', fortinet: 'Fortinet', cloudflare: 'Cloudflare', sonicwall: 'SonicWall',
  veeam: 'Veeam', cohesity: 'Cohesity', veritas: 'Veritas', netapp: 'NetApp',
  proofpoint: 'ProofPoint', opentext: 'OpenText', keeper: 'Keeper',
  jamf: 'Jamf', nutanix: 'Nutanix',
};

const now = Date.now();

export const PORTAL_LEADS = [
  {
    id: 'lead_001',
    company_name: 'Northstar Analytics',
    website: 'northstar-analytics.com.au',
    industry: 'Data Analytics',
    location: 'Sydney NSW',
    trust_score: 58,
    submitted_at: new Date(now - 6 * 60000).toISOString(),
    email_hint: 'c***@northstar-analytics.com.au',
    gaps: [
      { gap_id: 'edr', severity: 'critical', title: 'No endpoint protection', score_impact: 15 },
      { gap_id: 'soc2', severity: 'critical', title: 'SOC 2 not started', score_impact: 20 },
    ],
  },
  {
    id: 'lead_002',
    company_name: 'Meridian Payments',
    website: 'meridianpay.com.au',
    industry: 'Fintech',
    location: 'Melbourne VIC',
    trust_score: 47,
    submitted_at: new Date(now - 22 * 60000).toISOString(),
    email_hint: 'm***@meridianpay.com.au',
    gaps: [
      { gap_id: 'network_perimeter', severity: 'critical', title: 'No network perimeter', score_impact: 15 },
      { gap_id: 'mfa', severity: 'high', title: 'MFA not enforced', score_impact: 10 },
      { gap_id: 'backup', severity: 'moderate', title: 'No backup solution', score_impact: 5 },
    ],
  },
  {
    id: 'lead_003',
    company_name: 'CloudBase Systems',
    website: 'cloudbase.io',
    industry: 'Cloud Infrastructure',
    location: 'Brisbane QLD',
    trust_score: 63,
    submitted_at: new Date(now - 2.2 * 3600000).toISOString(),
    email_hint: 'a***@cloudbase.io',
    gaps: [
      { gap_id: 'soc2', severity: 'critical', title: 'SOC 2 not started', score_impact: 20 },
      { gap_id: 'edr', severity: 'high', title: 'Endpoint gaps detected', score_impact: 10 },
    ],
  },
  {
    id: 'lead_004',
    company_name: 'Finley Group',
    website: 'finleygroup.com.au',
    industry: 'Financial Services',
    location: 'Perth WA',
    trust_score: 41,
    submitted_at: new Date(now - 4.5 * 3600000).toISOString(),
    email_hint: 'j***@finleygroup.com.au',
    gaps: [
      { gap_id: 'edr', severity: 'critical', title: 'No endpoint protection', score_impact: 15 },
      { gap_id: 'mfa', severity: 'high', title: 'MFA not enforced', score_impact: 10 },
      { gap_id: 'backup', severity: 'moderate', title: 'No backup solution', score_impact: 5 },
      { gap_id: 'network_perimeter', severity: 'moderate', title: 'Network gaps detected', score_impact: 8 },
    ],
  },
  {
    id: 'lead_005',
    company_name: 'Cascada Tech',
    website: 'cascadatech.com',
    industry: 'B2B SaaS',
    location: 'Sydney NSW',
    trust_score: 72,
    submitted_at: new Date(now - 6.1 * 3600000).toISOString(),
    email_hint: 't***@cascadatech.com',
    gaps: [
      { gap_id: 'mfa', severity: 'high', title: 'MFA not enforced', score_impact: 10 },
      { gap_id: 'network_perimeter', severity: 'moderate', title: 'Network gaps detected', score_impact: 8 },
    ],
  },
  {
    id: 'lead_006',
    company_name: 'Apex Logistics',
    website: 'apexlogistics.com.au',
    industry: 'Supply Chain',
    location: 'Melbourne VIC',
    trust_score: 66,
    submitted_at: new Date(now - 23 * 3600000).toISOString(),
    email_hint: 'd***@apexlogistics.com.au',
    gaps: [
      { gap_id: 'edr', severity: 'critical', title: 'No endpoint protection', score_impact: 15 },
      { gap_id: 'backup', severity: 'moderate', title: 'No backup solution', score_impact: 5 },
      { gap_id: 'email_security', severity: 'moderate', title: 'No email security', score_impact: 5 },
    ],
  },
];

export function getMatchedVendors(lead, tenant) {
  if (!tenant) return [];
  const tenantSet = new Set(tenant.vendors);
  const map = new Map();
  for (const gap of lead.gaps) {
    const vendors = GAP_VENDOR_MAP[gap.gap_id] || [];
    for (const vid of vendors) {
      if (tenantSet.has(vid)) {
        if (!map.has(vid)) map.set(vid, { vendor_id: vid, name: VENDOR_NAMES[vid] || vid, gaps: [] });
        map.get(vid).gaps.push(gap.title);
      }
    }
  }
  return [...map.values()];
}

export function filterLeadsForTenant(leads, tenant) {
  if (!tenant || tenant.role === 'distributor') return leads;
  return leads.filter(lead => getMatchedVendors(lead, tenant).length > 0);
}

export function timeAgo(isoStr) {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
