import { tokens, PERSONA } from '../../tokens.js';
import { SPACE_GLYPHS } from '../../glyphs.jsx';
import { HIVE_STAGES } from '../../data/mock/hive.js';

// Discovery's one uniform action (John CTA-staging ruling 2026-08-23): no Apply,
// no calendar bounce-out mid-thought. Add to shortlist — the real engage actions
// live on the shortlist page.
import { AddToShortlist } from './AddToShortlist.jsx';
import { ClaimStrip } from './ClaimStrip.jsx';

function SeverityDot({ severity, t }) {
  const tk = tokens(t.theme);
  const c = severity === 'high'   ? tk.sevHigh
          : severity === 'medium' ? tk.sevMed
          : severity === 'ok'     ? tk.sevOk : tk.inkGhost;
  return <span style={{ width: 7, height: 7, borderRadius: '50%', background: c, display: 'inline-block' }} />;
}

function PSection({ kicker, title, source, children, t }) {
  const tk = tokens(t.theme);
  return (
    <section style={{ marginBottom: 44 }}>
      <header style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        gap: 16, marginBottom: 16, paddingBottom: 10,
        borderBottom: `1px solid ${tk.hairline}`,
      }}>
        <div>
          {kicker && (
            <div style={{
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 9.5, fontWeight: 600, letterSpacing: '0.22em',
              textTransform: 'uppercase', color: tk.inkSoft, marginBottom: 5,
            }}>{kicker}</div>
          )}
          <h2 style={{
            fontFamily: '"Instrument Serif", Georgia, serif', fontWeight: 400,
            fontSize: 23, letterSpacing: '-0.01em', color: tk.ink, margin: 0,
          }}>{title}</h2>
        </div>
        {source && (
          <span style={{
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: 9.5, color: tk.inkSoft, letterSpacing: '0.1em',
            textAlign: 'right', whiteSpace: 'nowrap', alignSelf: 'flex-end', paddingBottom: 4,
          }}>{source}</span>
        )}
      </header>
      {children}
    </section>
  );
}

function ProjectionShell({ tile, company, attributedTo, lastUpdated, children, t }) {
  const tk = tokens(t.theme);
  const color = tk[tile.token];
  const personaMeta = attributedTo ? PERSONA[attributedTo] : null;
  return (
    <div style={{
      maxWidth: 880, margin: '0 auto',
      padding: '36px 48px 60px',
      fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
    }}>
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22 }}>
            {SPACE_GLYPHS[tile.glyphKey]?.(color)}
          </span>
          <span style={{
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: 10.5, fontWeight: 600, letterSpacing: '0.24em',
            textTransform: 'uppercase', color,
          }}>Projection · {tile.kind}</span>
          {company === 'hive' && (
            <span style={{
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 9.5, letterSpacing: '0.16em', textTransform: 'uppercase',
              color: tk.umber, background: `${tk.umber}14`,
              border: `1px solid ${tk.umber}30`,
              borderRadius: 4, padding: '2px 7px',
            }}>Hive & Co</span>
          )}
          <span style={{ flex: 1 }} />
          {lastUpdated && (
            <span style={{
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 10, color: tk.inkSoft, letterSpacing: '0.08em',
            }}>updated {lastUpdated}</span>
          )}
        </div>
        <h1 style={{
          fontFamily: '"Instrument Serif", Georgia, serif', fontWeight: 400,
          fontSize: 'clamp(34px, 4vw, 48px)', color: tk.ink,
          letterSpacing: '-0.018em', lineHeight: 1.08, margin: 0,
        }}>{tile.title}</h1>
        {personaMeta && (
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: tk[personaMeta.token] }} />
            <span style={{
              fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
              fontSize: 13, fontWeight: 500, color: tk.inkMid, letterSpacing: '0.01em',
            }}>{personaMeta.label}&apos;s lens · {personaMeta.note.toLowerCase()}</span>
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

const YOURS_INVESTOR = {
  score: 72, peer: 'seed startups average 64', delta: '+4 since last week',
  summary: "Above the line. The gaps below decide it — close enough to a term sheet that timing matters more than story now.",
  gaps: [
    { label: 'No SOC 2 evidence',          severity: 'high',   source: 'Posture · 4m ago'           },
    { label: 'Breach exposure public',      severity: 'high',   source: 'Have I Been Pwned · 18m ago' },
    { label: 'SSL misconfiguration',        severity: 'medium', source: 'Cloudflare · 6m ago'         },
    { label: 'No access control evidence',  severity: 'high',   source: 'manual · not yet checked'    },
  ],
  evidence: [
    { label: 'Pen test',           state: 'scheduled', note: 'Q2 · CrowdStrike'       },
    { label: 'Cyber insurance',    state: 'active',    note: 'Coalition · renewed Mar' },
    { label: 'Privacy policy',     state: 'active',    note: 'reviewed Apr'           },
    { label: 'SOC 2 Type I',       state: 'missing',   note: 'no auditor engaged'     },
    { label: 'Cap table',          state: 'active',    note: 'Carta · synced 09:14'   },
    { label: 'Founder background', state: 'active',    note: 'public'                 },
  ],
  questions: [
    'How long until SOC 2 evidence is in the data room?',
    "What's your runway versus your remediation timeline?",
    'Who owns access control if your CTO is unavailable?',
  ],
};

function InvestorProjection({ panel, company, t }) {
  const tk = tokens(t.theme);
  const color = tk.plum;
  const tile = { kind: 'Investor', token: 'plum', glyphKey: 'investor', title: 'Investor Readiness' };
  const d = panel ?? YOURS_INVESTOR;

  const stateChip = (state) => ({
    c: state === 'active' ? tk.sevOk : state === 'scheduled' ? tk.umber : state === 'missing' ? tk.sevHigh : tk.inkSoft,
    label: { active: 'Active', scheduled: 'Scheduled', missing: 'Missing' }[state] || state,
  });

  return (
    <ProjectionShell tile={tile} company={company} attributedTo="sofia" lastUpdated="2m ago" t={t}>
      <div style={{
        display: 'flex', gap: 32, alignItems: 'center',
        padding: '28px 32px',
        background: tk.surface, border: `1px solid ${tk.hairline}`,
        borderRadius: 16, marginBottom: 44,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: 10, fontWeight: 600, color: tk.inkSoft,
            letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 9,
          }}>Where they stand</div>
          <p style={{
            fontFamily: '"Instrument Serif", Georgia, serif',
            fontSize: 20, lineHeight: 1.4, color: tk.ink,
            letterSpacing: '-0.005em', margin: '0 0 12px',
          }}>{d.summary}</p>
          <div style={{ fontFamily: '"IBM Plex Sans", system-ui, sans-serif', fontSize: 12, color: tk.inkSoft, letterSpacing: '0.04em' }}>
            {d.delta && <span>{d.delta}</span>}
            {d.delta && d.peer && <span style={{ margin: '0 10px', color: tk.inkGhost }}>·</span>}
            {d.peer && <span>{d.peer}</span>}
          </div>
        </div>
      </div>

      {d.gaps.length > 0 && (
        <PSection kicker="What's stopping the wire" title="Gaps to close" source="from Posture · live" t={t}>
          {d.gaps.map((g, i) => (
            <div key={g.label} style={{
              display: 'grid', gridTemplateColumns: '10px 1fr auto auto',
              alignItems: 'center', gap: 14, padding: '13px 0',
              borderBottom: i < d.gaps.length - 1 ? `1px solid ${tk.hairline}` : 'none',
            }}>
              <SeverityDot severity={g.severity} t={t} />
              <span style={{ fontSize: 14.5, color: tk.ink }}>{g.label}</span>
              <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 9.5, color: g.severity === 'high' ? tk.sevHigh : tk.sevMed, letterSpacing: '0.16em', textTransform: 'uppercase' }}>{g.severity}</span>
              <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, color: tk.inkSoft, letterSpacing: '0.04em', textAlign: 'right' }}>{g.source}</span>
            </div>
          ))}
        </PSection>
      )}

      <PSection kicker="What they have" title="Evidence layer" source={`${d.evidence.filter(e => e.state !== 'missing').length} attested · ${d.evidence.filter(e => e.state === 'missing').length} missing`} t={t}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {d.evidence.map(e => {
            const { c, label } = stateChip(e.state);
            return (
              <div key={e.label} style={{ padding: '14px 16px', background: tk.surfaceLo, border: `1px solid ${tk.hairline}`, borderRadius: 10 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: tk.ink }}>{e.label}</span>
                  <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 9.5, color: c, letterSpacing: '0.14em', textTransform: 'uppercase' }}>{label}</span>
                </div>
                <div style={{ fontFamily: '"IBM Plex Sans", system-ui, sans-serif', fontSize: 12, color: tk.inkSoft }}>{e.note}</div>
              </div>
            );
          })}
        </div>
      </PSection>

      <PSection kicker="The questions being asked" title="What investors are grading on" source="Sophia · live" t={t}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {d.questions.map((q, i) => (
            <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', paddingLeft: 18, position: 'relative' }}>
              <span style={{ position: 'absolute', left: 0, top: -4, fontFamily: '"Instrument Serif", Georgia, serif', fontSize: 24, color, opacity: 0.6 }}>&ldquo;</span>
              <span style={{ fontFamily: '"Instrument Serif", Georgia, serif', fontStyle: 'italic', fontSize: 17.5, color: tk.ink, lineHeight: 1.4 }}>{q}</span>
            </div>
          ))}
        </div>
      </PSection>
    </ProjectionShell>
  );
}

const YOURS_VENDORS = {
  summary: "Four names. The sequence is the signal — what you adopt first tells buyers and investors what you're prioritising.",
  vendors: [
    { name: 'Vanta',      category: 'Compliance', priority: 'start_here',  why: 'Closes the SOC 2 gap fastest at this stage',           addresses: 'No SOC 2 evidence'                      },
    { name: 'Cloudflare', category: 'Security',   priority: 'recommended', why: 'Fixes SSL + breach exposure in the same pass',         addresses: 'SSL misconfiguration · Breach exposure'  },
    { name: 'Drata',      category: 'Compliance', priority: 'recommended', why: 'Alternative to Vanta if you want auditor flexibility', addresses: 'No SOC 2 evidence'                      },
    { name: 'Sumsub',     category: 'KYC',        priority: 'considered',  why: 'Only if you raise overseas this round',                addresses: 'Future · enterprise contracts'           },
  ],
};

function VendorsProjection({ panel, company, t }) {
  const tk = tokens(t.theme);
  const tile = { kind: 'Vendors', token: 'umber', glyphKey: 'vendors', title: 'Vendors matched to your gaps' };
  const d = panel ?? YOURS_VENDORS;
  const priorityColor = (p) => p === 'start_here' ? tk.plum : p === 'recommended' ? tk.umber : tk.inkSoft;
  const priorityLabel = (p) => p === 'start_here' ? 'Start here' : p === 'recommended' ? 'Recommended' : 'Considered';

  return (
    <ProjectionShell tile={tile} company={company} attributedTo="leonardo" lastUpdated="6m ago" t={t}>
      <p style={{ fontFamily: '"IBM Plex Sans", system-ui, sans-serif', fontSize: 16, lineHeight: 1.55, color: tk.inkMid, margin: '0 0 36px', maxWidth: 640 }}>
        {d.summary}
      </p>
      {d.vendors.length === 0 ? (
        <div style={{ fontFamily: '"Instrument Serif", Georgia, serif', fontStyle: 'italic', fontSize: 17, color: tk.inkSoft, padding: '32px 0' }}>
          {d.emptyNote ?? "No vendors matched yet."}
        </div>
      ) : (
        <PSection kicker="Shortlist" title="In order of sequence" source={`matched to ${d.vendors.length} gaps`} t={t}>
          {d.vendors.map((v, i) => (
            <div key={v.name} style={{
              padding: '20px 0',
              borderBottom: i < d.vendors.length - 1 ? `1px solid ${tk.hairline}` : 'none',
              display: 'grid', gridTemplateColumns: '28px 1fr 1fr auto', gap: 16,
            }}>
              <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, color: tk.inkSoft, letterSpacing: '0.08em', paddingTop: 4 }}>{String(i + 1).padStart(2, '0')}</span>
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 5 }}>
                  <span style={{ fontFamily: '"Instrument Serif", Georgia, serif', fontSize: 22, color: tk.ink, letterSpacing: '-0.01em' }}>{v.name}</span>
                  <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 9, color: tk.inkSoft, letterSpacing: '0.16em', textTransform: 'uppercase' }}>{v.category}</span>
                </div>
                <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 9.5, fontWeight: 600, color: priorityColor(v.priority), letterSpacing: '0.18em', textTransform: 'uppercase' }}>{priorityLabel(v.priority)}</div>
              </div>
              <div>
                <div style={{ fontFamily: '"IBM Plex Sans", system-ui, sans-serif', fontSize: 13.5, color: tk.inkMid, lineHeight: 1.5, marginBottom: 8 }}>{v.why}</div>
                <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 9.5, color: tk.inkSoft, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Addresses · {v.addresses}</div>
              </div>
              <AddToShortlist item={{ name: v.name, category: v.category, why: v.why, source: 'vendors panel' }} accent={tk.teal} />
            </div>
          ))}
        </PSection>
      )}
    </ProjectionShell>
  );
}

const VENDOR_PAGES = {
  vanta: {
    title: 'Vanta compliance programs for your stage',
    attributedTo: 'edison', glyphKey: 'vanta', token: 'teal',
    source: 'Vanta · direct partner',
    summary: "SOC 2 in 90 days. Most founders delay this until a deal demands it — by then you're already 3 months from closing.",
    programs: [
      { name: 'SOC 2 Type I',       status: 'available',    value: 'Readiness in 30 days',                  detail: 'Point-in-time audit — fastest path to a trust report' },
      { name: 'SOC 2 Type II',      status: 'available',    value: 'Full 6-month audit period',             detail: 'The standard enterprise buyers require — start now, close in Q3' },
      { name: 'ISO 27001',          status: 'eligible',     value: 'International certification',           detail: 'Required for EU + APAC enterprise deals — available after Type II' },
      { name: 'HIPAA compliance',   status: 'eligible',     value: 'Healthcare sector access',              detail: 'Required if you touch health data — Vanta automates 80% of evidence' },
      { name: 'GDPR readiness',     status: 'available',    value: 'EU data compliance',                    detail: 'Required for any EU customer data — available now' },
      { name: 'PCI DSS',            status: 'not_enrolled', value: 'Cardholder data security',              detail: 'Required if you process payments directly' },
    ],
  },
  cisco: {
    title: 'Cisco security programs via Ingram Micro',
    attributedTo: 'edison', glyphKey: 'cisco', token: 'teal',
    source: 'Cisco · via Ingram Micro ANZ',
    summary: "Enterprise procurement trusts Cisco on sight. Duo takes a day to deploy. Umbrella runs at the DNS layer. Meraki is the network enterprise buyers expect.",
    programs: [
      { name: 'Cisco Duo MFA',          status: 'available',    value: 'MFA for any stack in one day',      detail: 'Works with Google, Microsoft, AWS, Slack — no infrastructure changes' },
      { name: 'Cisco Umbrella',         status: 'available',    value: 'DNS-layer threat protection',       detail: 'Blocks malware, phishing, ransomware before it reaches your network' },
      { name: 'Cisco Meraki',           status: 'eligible',     value: 'Cloud-managed networking',          detail: 'The network stack enterprise IT departments recognise and trust' },
      { name: 'Cisco Secure Firewall',  status: 'eligible',     value: 'Next-gen perimeter security',       detail: 'Required for enterprise network compliance posture' },
      { name: 'Cisco SecureX',          status: 'not_enrolled', value: 'Unified security platform',         detail: 'Integrates all Cisco security tools — unlock after Duo and Umbrella' },
    ],
  },
  ingram: {
    title: 'Ingram Micro channel programs',
    attributedTo: 'leonardo', glyphKey: 'vendors', token: 'umber',
    source: 'Ingram Micro ANZ · channel partner',
    summary: "23,000+ products. The distribution layer behind AWS, Microsoft, Cisco, and Cloudflare. One reseller account unlocks the entire stack.",
    programs: [
      { name: 'Reseller onboarding',        status: 'available',    value: 'Access 23,000+ products',           detail: 'Get reseller pricing on the full Ingram ANZ catalog — apply online' },
      { name: 'Microsoft CSP',              status: 'available',    value: 'Microsoft 365 via CSP channel',     detail: 'Bundle M365, Azure, Teams, and Copilot through a single Ingram order' },
      { name: 'Cisco partner access',       status: 'available',    value: 'Full Cisco portfolio',              detail: 'Duo, Umbrella, Meraki — partner pricing through Ingram ANZ' },
      { name: 'Xvantage Cloud marketplace', status: 'eligible',     value: 'SaaS licensing platform',           detail: 'Manage all cloud subscriptions from a single Ingram portal' },
    ],
  },
  stripe: {
    title: 'Stripe programs for scaling startups',
    attributedTo: 'leonardo', glyphKey: 'vendors', token: 'umber',
    source: 'Stripe · direct',
    summary: "Investors look at your Stripe dashboard before they look at your deck. Revenue Recognition, Atlas, and Capital are the three Stripe products that change your fundraise story.",
    programs: [
      { name: 'Stripe Atlas',             status: 'available',    value: 'US incorporation in 2 days',        detail: 'Delaware C-Corp or LLC — preferred structure for US venture capital' },
      { name: 'Revenue Recognition',      status: 'available',    value: 'Investor-grade revenue reporting',  detail: 'GAAP-compliant revenue reporting that auditors and investors trust' },
      { name: 'Stripe Tax',               status: 'available',    value: 'Automated global tax compliance',   detail: 'Required once you sell across AU state lines or internationally' },
      { name: 'Stripe Invoicing',         status: 'available',    value: 'B2B payment infrastructure',        detail: 'Enterprise invoicing with auto-reconciliation to your accounting stack' },
      { name: 'Stripe Capital',           status: 'eligible',     value: 'Revenue-based financing',           detail: 'Up to 12 months MRR as a cash advance — no dilution, no VC' },
    ],
  },
  nvidia: {
    title: 'NVIDIA programs for AI startups',
    attributedTo: 'edison', glyphKey: 'vendors', token: 'teal',
    source: 'NVIDIA · developer program',
    summary: "Inception gives you GPU credits and technical access. NIM API is free-tier inference today. DGX Cloud is the path to dedicated compute at scale.",
    programs: [
      { name: 'NVIDIA Inception',         status: 'available',    value: 'Free GPU credits + technical support', detail: 'Startup program — DGX Cloud credits, training, and enterprise introductions' },
      { name: 'NIM API (free tier)',       status: 'available',    value: 'Hosted inference — 0 cost to start',  detail: 'Access to 50+ foundation models via OpenAI-compatible API' },
      { name: 'DGX Cloud',                status: 'eligible',     value: 'Dedicated AI compute',               detail: 'Bare-metal H100 clusters — unlocks when workload justifies dedicated GPU' },
      { name: 'NVAIE (AI Enterprise)',    status: 'not_enrolled', value: 'Enterprise AI software stack',        detail: 'Full NVIDIA software suite for enterprise deployment — contact for pricing' },
    ],
  },
  perplexity: {
    title: 'Perplexity for research and due diligence',
    attributedTo: 'edison', glyphKey: 'vendors', token: 'teal',
    source: 'Perplexity AI · direct',
    summary: "Live web intelligence. Not cached knowledge. For due diligence, market research, and competitive analysis where recency is the whole point.",
    programs: [
      { name: 'Perplexity Pro',           status: 'available',    value: 'Unlimited live web search',         detail: 'Real-time retrieval across the entire web — $20/mo, cancel anytime' },
      { name: 'Perplexity API',           status: 'available',    value: 'Programmatic search access',        detail: 'Build live research into your product — OpenAI-compatible endpoint' },
      { name: 'Enterprise Pro',           status: 'eligible',     value: 'Team search + SSO',                 detail: 'Private search history, SOC 2 compliant, SAML SSO — contact for pricing' },
    ],
  },
  gemini: {
    title: 'Google Gemini and Cloud AI programs',
    attributedTo: 'edison', glyphKey: 'vendors', token: 'teal',
    source: 'Google · via Vertex AI',
    summary: "1M token context. Multimodal. Google for Startups gives you $200k in Cloud credits. Gemini is the right tool for long document synthesis and large-context reasoning.",
    programs: [
      { name: 'Google for Startups',      status: 'available',    value: 'Up to $200k Cloud credits',         detail: 'AI-focused startups qualify — apply via Google Cloud startup program' },
      { name: 'Gemini API (free tier)',   status: 'available',    value: 'Free inference to prototype',        detail: '15 RPM, 1M context window — enough to build without cost' },
      { name: 'Vertex AI',               status: 'available',    value: 'Production AI platform',             detail: 'Managed ML pipeline on Google Cloud — access via Cloud credits' },
      { name: 'Google AI Studio',        status: 'available',    value: 'No-code model access',               detail: 'Prototype with Gemini and Gemma models — free, no credit card' },
      { name: 'Workspace Business',      status: 'eligible',     value: 'Gemini in Docs + Gmail',             detail: 'AI writing and summarisation built into your existing Workspace' },
    ],
  },
  anthropic: {
    title: 'Anthropic Claude programs',
    attributedTo: 'edison', glyphKey: 'vendors', token: 'teal',
    source: 'Anthropic · direct',
    summary: "The reasoning model enterprise buyers trust for sensitive workloads. Constitutional AI, long context, and the lowest hallucination rate of any frontier model.",
    programs: [
      { name: 'Claude API (Haiku)',       status: 'available',    value: '$0.25 per 1M tokens — fast and cheap', detail: 'Production-grade inference for high-volume, latency-sensitive tasks' },
      { name: 'Claude API (Sonnet)',      status: 'available',    value: 'Balanced — the most deployed model',    detail: 'Best performance-to-cost ratio for most enterprise workloads' },
      { name: 'Claude API (Opus)',        status: 'available',    value: 'Frontier reasoning',                   detail: 'Highest-capability model for complex analysis and multi-step reasoning' },
      { name: 'Claude Enterprise',       status: 'eligible',     value: 'SSO + data privacy + SLAs',            detail: 'SOC 2 Type II, HIPAA BAA, zero data retention — contact sales' },
      { name: 'Claude via AWS Bedrock',  status: 'eligible',     value: 'Claude inside your AWS environment',   detail: 'Keep everything in AWS — no separate API key, same pricing' },
    ],
  },
  xero: {
    title: 'Xero financial programs for founders',
    attributedTo: 'sofia', glyphKey: 'vendors', token: 'umber',
    source: 'Xero · direct partner',
    summary: "Clean books are the fastest due diligence signal. Investor DD starts with your Xero dashboard — what they see in the first 10 minutes determines whether the process continues.",
    programs: [
      { name: 'Xero Starter',            status: 'available',    value: '5 invoices + bank reconciliation',  detail: 'The baseline — get clean books before your next investor meeting' },
      { name: 'Xero Standard',           status: 'available',    value: 'Unlimited invoicing + payroll',     detail: 'The right tier for most startups — $65/mo' },
      { name: 'Xero Premium',            status: 'eligible',     value: 'Multi-currency + advanced reporting', detail: 'Required once you have international revenue or investors in multiple currencies' },
      { name: 'Xero for Accountants',   status: 'eligible',     value: 'Direct accountant access',           detail: 'Your accountant works in the same system — no export/import cycle' },
    ],
  },
  hubspot: {
    title: 'HubSpot CRM programs for founders',
    attributedTo: 'leonardo', glyphKey: 'vendors', token: 'umber',
    source: 'HubSpot for Startups',
    summary: "Pipeline evidence is what investors ask for after financials. HubSpot for Startups is 90% off year one. Your CRM data tells the revenue story your deck only hints at.",
    programs: [
      { name: 'HubSpot for Startups',    status: 'available',    value: 'Up to 90% off year one',          detail: 'Seed and Series A startups qualify — apply via an approved VC or accelerator' },
      { name: 'CRM (free)',              status: 'available',    value: 'Contact management — no cost',    detail: 'Full CRM free forever — upgrade when you need automation' },
      { name: 'Marketing Hub',           status: 'available',    value: 'Email + landing pages + forms',   detail: 'Investor-grade acquisition funnel evidence' },
      { name: 'Sales Hub',               status: 'eligible',     value: 'Pipeline + deal tracking',        detail: 'The data investors want — close rate, deal velocity, pipeline coverage ratio' },
      { name: 'Service Hub',             status: 'eligible',     value: 'Customer retention evidence',     detail: 'Churn data and NPS scores are what Series B investors look at first' },
      { name: 'HubSpot Marketplace',    status: 'not_enrolled', value: '500+ integrations',               detail: 'Connect to Xero, Stripe, Slack, and your full stack' },
    ],
  },
};

function VendorDetailProjection({ id, company, t }) {
  const tk = tokens(t.theme);
  const d = VENDOR_PAGES[id];
  if (!d) return null;
  const tile = { kind: 'Programs', token: d.token, glyphKey: d.glyphKey, title: d.title };
  const statusColor = (s) => s === 'available' ? tk.sevOk : s === 'eligible' ? tk.umber : tk.inkSoft;
  const statusLabel = (s) => s === 'available' ? 'Available' : s === 'eligible' ? 'Eligible' : 'Not enrolled';
  return (
    <ProjectionShell tile={tile} company={company} attributedTo={d.attributedTo} lastUpdated="live" t={t}>
      <p style={{ fontFamily: '"IBM Plex Sans", system-ui, sans-serif', fontSize: 16, lineHeight: 1.55, color: tk.inkMid, margin: '0 0 36px', maxWidth: 640 }}>
        {d.summary}
      </p>
      <PSection kicker="Programs" title="Where you can apply now" source={d.source} t={t}>
        {d.programs.map((p, i) => (
          <div key={p.name} style={{
            padding: '18px 0',
            borderBottom: i < d.programs.length - 1 ? `1px solid ${tk.hairline}` : 'none',
            display: 'grid', gridTemplateColumns: '1fr auto', gap: 12,
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
                <span style={{ fontFamily: '"IBM Plex Sans", system-ui, sans-serif', fontSize: 15, fontWeight: 600, color: tk.ink, letterSpacing: '-0.005em' }}>{p.name}</span>
                <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 9.5, color: statusColor(p.status), letterSpacing: '0.16em', textTransform: 'uppercase' }}>{statusLabel(p.status)}</span>
              </div>
              <div style={{ fontFamily: '"IBM Plex Sans", system-ui, sans-serif', fontSize: 13, lineHeight: 1.5, color: tk.inkMid }}>{p.value} · {p.detail}</div>
            </div>
            {(p.status === 'available' || p.status === 'eligible') && (
              <AddToShortlist item={{ name: p.name, why: p.value, source: 'programs panel' }} accent={tk.teal} />
            )}
          </div>
        ))}
      </PSection>
    </ProjectionShell>
  );
}

const YOURS_AWS = {
  summary: "Ten programs. Most founders apply for one or two and stop. $220k+ in credits and co-sell opportunities are sitting unclaimed at your stage.",
  programs: [
    { name: 'AWS Activate',                   status: 'available',    value: 'Up to $100k credits',                  detail: 'Portfolio org unlocks higher tier · apply now',                    url: 'https://aws.amazon.com/activate'                                 },
    { name: 'Startup Credits',                status: 'available',    value: '$10k unclaimed',                       detail: 'Already granted · expires Q4 · log in to redeem',                url: 'https://console.aws.amazon.com'                                  },
    { name: 'Well-Architected Review',        status: 'available',    value: 'Free architectural review',            detail: 'No cost · schedule with Solutions Architect this week',           url: 'https://aws.amazon.com/architecture/well-architected'            },
    { name: 'AWS Global Startup Program',     status: 'available',    value: 'Technical mentorship + $25k credits',  detail: 'Startup stage qualifies · 4–6 week engagement',                   url: 'https://aws.amazon.com/startups/startup-programs'                },
    { name: 'AWS ISV Accelerate',             status: 'eligible',     value: 'Co-sell with AWS field reps',          detail: 'Requires Marketplace listing + APN membership',                   url: 'https://aws.amazon.com/partners/programs/isv-accelerate'         },
    { name: 'Foundational Technical Review',  status: 'eligible',     value: 'Pre-market security clearance',        detail: 'Required before ISV Accelerate · ~2-week assessment',             url: 'https://aws.amazon.com/partners/foundational-technical-review'   },
    { name: 'AWS Marketplace Seller',         status: 'eligible',     value: '300k+ enterprise buyers',              detail: 'SaaS listing takes 2–4 weeks via APN portal',                     url: 'https://aws.amazon.com/marketplace/management'                   },
    { name: 'AWS Partner Network — ISV Track',status: 'not_enrolled', value: 'Advanced partner discounts + MDF',     detail: 'Two validated customer references required to qualify'                                                                                    },
    { name: 'Migration Acceleration Program', status: 'not_enrolled', value: 'Up to 25% AWS cost offset',            detail: 'Requires projected workload ≥ $25k/mo — unlocks at scale'                                                                               },
    { name: 'AWS MSSP Competency',            status: 'not_enrolled', value: 'Managed security co-sell motion',      detail: 'Requires 3 active managed security customers first'                                                                                      },
  ],
};

const YOURS_MICROSOFT = {
  summary: "Six Microsoft programs. Founders Hub is unclaimed — that's $150k in Azure credits sitting there. The other five range from immediate to a 60-day path.",
  programs: [
    { name: 'Microsoft for Startups Founders Hub',  status: 'available',    value: 'Up to $150k Azure credits + GitHub Enterprise + M365', detail: 'Startup stage qualifies · 20-minute application',             url: 'https://www.microsoft.com/en-us/startups'                             },
    { name: 'GitHub Copilot for Business',          status: 'available',    value: 'Free via Founders Hub',                               detail: 'Included · activate in GitHub settings after Hub onboarding', url: 'https://github.com/features/copilot'                                  },
    { name: 'Ingram Micro AMP — Azure Assessment',  status: 'available',    value: 'Free Azure migration assessment',                     detail: 'Free via Ingram ANZ · no existing Azure footprint needed',    url: 'https://www.ingrammicro.com/en-AU/services/microsoft'                 },
    { name: 'Ingram Micro Xvantage — CSP',          status: 'eligible',     value: 'Microsoft 365 via CSP channel',                       detail: 'Available through Ingram Micro ANZ · bundled management',     url: 'https://xvantage.ingrammicro.com'                                     },
    { name: 'Microsoft AI Cloud Partner Program',   status: 'eligible',     value: 'Azure OpenAI Service credits + technical support',    detail: 'AI workload qualifies · partner designation required',        url: 'https://partner.microsoft.com'                                        },
    { name: 'Azure Marketplace — Transact Listing', status: 'not_enrolled', value: '10% marketplace reward on all transactions',          detail: 'Phase 2 play · after Founders Hub onboarding and scale',      url: 'https://partner.microsoft.com/en-us/partnership/azure-marketplace'    },
  ],
};

function AwsProjection({ panel, company, t }) {
  const tk = tokens(t.theme);
  const tile = { kind: 'AWS', token: 'aws', glyphKey: 'aws', title: 'AWS programs matched to your stage' };
  const d = panel ?? YOURS_AWS;
  const availableCount = d.programs.filter(p => p.status === 'available').length;
  const statusColor = (s) => s === 'available' ? tk.sevOk : s === 'eligible' ? tk.umber : tk.inkSoft;
  const statusLabel = (s) => s === 'available' ? 'Available' : s === 'eligible' ? 'Eligible' : 'Not enrolled';

  return (
    <ProjectionShell tile={tile} company={company} attributedTo="edison" lastUpdated="9m ago" t={t}>
      {/* AWS co-sell hero — the commercial moment, top of the panel */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 20,
        padding: '22px 26px', marginBottom: 30,
        background: tk.awsInk, borderRadius: 14,
      }}>
        <span style={{ display: 'flex', width: 42, height: 42, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {SPACE_GLYPHS[tile.glyphKey]?.(tk.aws)}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, fontWeight: 600,
            letterSpacing: '0.22em', textTransform: 'uppercase', color: tk.aws, marginBottom: 7,
          }}>AWS Marketplace · Co-sell</div>
          <div style={{
            fontFamily: '"Instrument Serif", Georgia, serif', fontSize: 30,
            color: '#ffffff', lineHeight: 1.05, letterSpacing: '-0.015em',
          }}>{d.creditHeadline ?? '$220k+ in credits + co-sell'}</div>
          <div style={{
            fontFamily: '"IBM Plex Sans", system-ui, sans-serif', fontSize: 12.5,
            color: '#c2c8d2', marginTop: 8,
          }}>{availableCount} available now · {d.programs.length} matched to your stage</div>
        </div>
        <AddToShortlist
          item={{ name: 'AWS Marketplace co-sell', why: d.creditHeadline ?? '$220k+ in credits + co-sell', source: 'aws panel' }}
          accent={tk.aws}
          style={{
            flexShrink: 0, alignSelf: 'center',
            background: tk.aws, color: tk.awsInk,
            fontFamily: '"IBM Plex Sans", system-ui, sans-serif', fontSize: 13, fontWeight: 700,
            padding: '10px 18px', borderRadius: 9, borderBottom: 'none',
            letterSpacing: '0.01em', whiteSpace: 'nowrap',
          }}
        />
      </div>
      <p style={{ fontFamily: '"IBM Plex Sans", system-ui, sans-serif', fontSize: 16, lineHeight: 1.55, color: tk.inkMid, margin: '0 0 36px', maxWidth: 640 }}>
        {d.summary}
      </p>
      {d.programs.length === 0 ? (
        <div style={{ fontFamily: '"Instrument Serif", Georgia, serif', fontStyle: 'italic', fontSize: 17, color: tk.inkSoft, padding: '32px 0' }}>
          {d.emptyNote ?? "No programs matched yet."}
        </div>
      ) : (
        <PSection kicker="Programs" title="Where you can apply now" source="AWS marketplace · live" t={t}>
          {d.programs.map((p, i) => (
            <div key={p.name} style={{
              padding: '18px 0',
              borderBottom: i < d.programs.length - 1 ? `1px solid ${tk.hairline}` : 'none',
              display: 'grid', gridTemplateColumns: '1fr auto', gap: 12,
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontFamily: '"IBM Plex Sans", system-ui, sans-serif', fontSize: 15, fontWeight: 600, color: tk.ink, letterSpacing: '-0.005em' }}>{p.name}</span>
                  <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 9.5, color: statusColor(p.status), letterSpacing: '0.16em', textTransform: 'uppercase' }}>{statusLabel(p.status)}</span>
                </div>
                <div style={{ fontFamily: '"IBM Plex Sans", system-ui, sans-serif', fontSize: 13, lineHeight: 1.5, color: tk.inkMid }}>{p.value} · {p.detail}</div>
              </div>
              {(p.status === 'available' || p.status === 'eligible') && (
                <AddToShortlist item={{ name: p.name, why: p.value, source: 'programs panel' }} accent={tk.teal} />
              )}
            </div>
          ))}
        </PSection>
      )}
    </ProjectionShell>
  );
}

function MicrosoftProjection({ panel, company, t }) {
  const tk = tokens(t.theme);
  const tile = { kind: 'Programs', token: 'teal', glyphKey: 'microsoft', title: 'Microsoft programs matched to your stage' };
  const d = panel ?? YOURS_MICROSOFT;
  const statusColor = (s) => s === 'available' ? tk.sevOk : s === 'eligible' ? tk.umber : tk.inkSoft;
  const statusLabel = (s) => s === 'available' ? 'Available' : s === 'eligible' ? 'Eligible' : 'Not enrolled';

  return (
    <ProjectionShell tile={tile} company={company} attributedTo="leonardo" lastUpdated="5m ago" t={t}>
      <p style={{ fontFamily: '"IBM Plex Sans", system-ui, sans-serif', fontSize: 16, lineHeight: 1.55, color: tk.inkMid, margin: '0 0 36px', maxWidth: 640 }}>
        {d.summary}
      </p>
      {d.programs.length === 0 ? (
        <div style={{ fontFamily: '"Instrument Serif", Georgia, serif', fontStyle: 'italic', fontSize: 17, color: tk.inkSoft, padding: '32px 0' }}>
          {d.emptyNote ?? "No programs matched yet."}
        </div>
      ) : (
        <PSection kicker="Programs" title="Where you can apply now" source="Microsoft Partner Network · Ingram Micro ANZ" t={t}>
          {d.programs.map((p, i) => (
            <div key={p.name} style={{
              padding: '18px 0',
              borderBottom: i < d.programs.length - 1 ? `1px solid ${tk.hairline}` : 'none',
              display: 'grid', gridTemplateColumns: '1fr auto', gap: 12,
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontFamily: '"IBM Plex Sans", system-ui, sans-serif', fontSize: 15, fontWeight: 600, color: tk.ink, letterSpacing: '-0.005em' }}>{p.name}</span>
                  <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 9.5, color: statusColor(p.status), letterSpacing: '0.16em', textTransform: 'uppercase' }}>{statusLabel(p.status)}</span>
                </div>
                <div style={{ fontFamily: '"IBM Plex Sans", system-ui, sans-serif', fontSize: 13, lineHeight: 1.5, color: tk.inkMid }}>{p.value} · {p.detail}</div>
              </div>
              {(p.status === 'available' || p.status === 'eligible') && (
                <AddToShortlist item={{ name: p.name, why: p.value, source: 'programs panel' }} accent={tk.teal} />
              )}
            </div>
          ))}
        </PSection>
      )}
    </ProjectionShell>
  );
}

const YOURS_POSTURE = {
  summary: "Three high. Three medium. One verified. The high ones are what investors see first.",
  items: [
    { label: 'SSL / TLS',       status: 'Issues found',      severity: 'high',    source: 'Cloudflare · 6m ago'  },
    { label: 'Access Control',  status: 'No evidence',       severity: 'high',    source: 'manual · not checked' },
    { label: 'Breach Monitor',  status: 'Exposure detected', severity: 'high',    source: 'HIBP · 18m ago'       },
    { label: 'Data Privacy',    status: 'Unknown',           severity: 'unknown', source: 'no integration'       },
    { label: 'MFA Enforcement', status: 'Not configured',    severity: 'medium',  source: 'Okta · 1h ago'        },
    { label: 'DNS Hardening',   status: 'Partial',           severity: 'medium',  source: 'Cloudflare · 6m ago'  },
    { label: 'Backup Recovery', status: 'Verified',          severity: 'ok',      source: 'AWS · 4h ago'         },
  ],
};

function PostureProjection({ panel, company, t }) {
  const tk = tokens(t.theme);
  const tile = { kind: 'Posture', token: 'teal', glyphKey: 'posture', title: 'Live security posture' };
  const d = panel ?? YOURS_POSTURE;
  const sevColor = (s) => s === 'high' ? tk.sevHigh : s === 'medium' ? tk.sevMed : s === 'ok' ? tk.sevOk : tk.inkGhost;

  return (
    <ProjectionShell tile={tile} company={company} attributedTo="edison" lastUpdated="6m ago" t={t}>
      <p style={{ fontFamily: '"IBM Plex Sans", system-ui, sans-serif', fontSize: 16, lineHeight: 1.55, color: tk.inkMid, margin: '0 0 36px', maxWidth: 640 }}>
        {d.summary}
      </p>
      <PSection kicker="Checks" title="What's running right now" source={`${d.items.length} integrations · live`} t={t}>
        {d.items.map((it, i) => (
          <div key={it.label} style={{
            display: 'grid', gridTemplateColumns: '14px 1fr auto auto',
            alignItems: 'center', gap: 14, padding: '13px 0',
            borderBottom: i < d.items.length - 1 ? `1px solid ${tk.hairline}` : 'none',
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: sevColor(it.severity) }}/>
            <span style={{ fontSize: 14.5, color: tk.ink }}>{it.label}</span>
            <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10.5, color: sevColor(it.severity), letterSpacing: '0.04em' }}>{it.status}</span>
            <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 9.5, color: tk.inkSoft, letterSpacing: '0.04em', textAlign: 'right' }}>{it.source}</span>
          </div>
        ))}
      </PSection>
    </ProjectionShell>
  );
}

const YOURS_SPV = {
  summary: "A picture of you, not a file. The room remembers — each turn adds a fragment.",
  fields: [
    { label: 'Entity status',  value: 'Not registered', color: 'umber'   },
    { label: 'Trust score',    value: '72 / 100',       color: 'plum'    },
    { label: 'Attestations',   value: '0 filed',        color: 'inkSoft' },
    { label: 'Investor links', value: '0 sent',         color: 'inkSoft' },
  ],
};

function SpvProjection({ panel, company, t }) {
  const tk = tokens(t.theme);
  const tile = { kind: 'SPV', token: 'plum', glyphKey: 'spv', title: 'Your operational passport' };
  const d = panel ?? YOURS_SPV;

  return (
    <ProjectionShell tile={tile} company={company} attributedTo="leonardo" lastUpdated="just now" t={t}>
      <p style={{ fontFamily: '"IBM Plex Sans", system-ui, sans-serif', fontSize: 16, lineHeight: 1.55, color: tk.inkMid, margin: '0 0 36px', maxWidth: 640 }}>
        {d.summary}
      </p>
      <PSection kicker="Current state" title="What the passport says today" t={t}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {d.fields.map(f => (
            <div key={f.label} style={{ padding: '16px 18px', background: tk.surfaceLo, border: `1px solid ${tk.hairline}`, borderRadius: 10 }}>
              <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 9.5, color: tk.inkSoft, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 6 }}>{f.label}</div>
              <div style={{ fontFamily: '"Instrument Serif", Georgia, serif', fontSize: 22, color: tk[f.color] ?? tk.inkSoft, letterSpacing: '-0.01em' }}>{f.value}</div>
            </div>
          ))}
        </div>
      </PSection>
    </ProjectionShell>
  );
}

// ── What you've kept ─────────────────────────────────────────────────────────
// John, 2026-08-26: "the short list/what you have kept, should be the thing,
// context around it, and that 'engagement portal' gives you the CTAs. Like you
// can see for the other part of the left side of the screen."
//
// The first cut of this was a black full-page route. It took over the tab, and
// "back to the conversation" remounted Chat — which restores no transcript — so
// it booted a fresh proof360 and the conversation was gone. The estate already
// had the right form on screen: the Vendors projection. Same shell, same idiom,
// live data, opening OVER the conversation like every other projection.
//
// Leads with what was kept, because that is the thing. Claims come after, as the
// evidence that earned it.
// Every text slot on this projection goes through here. An object in a React text
// child THROWS — it does not stringify — so one unexpected shape replaced the
// entire chat with a black RENDER ERROR screen: "Minified React error #31,
// args[]=object with keys {at, turn, spans, recent, note, note_status}" (John,
// 2026-08-26, after keeping the AWS suggestions).
//
// That object is momentContext(). It was rendered as if it were a string because
// the fixture said so — the same fault that produced "[object Object]" in
// ClaimStrip, except this one took the application down instead of one line.
// A projection must never be able to do that: anything that is not text renders
// as nothing at all.
function text(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string') return v.trim() || null;
  if (typeof v === 'number') return String(v);
  return null;
}

function moveTitle(move) {
  // Titled by the ITEM, never the route. Every AWS offer routes ingram_micro_aws,
  // so titling by route label rendered five different programs as five identical
  // lines reading "AWS pathway via Ingram Micro" (John's screenshot, 2026-08-26).
  return text(move.item?.title) || text(move.item?.name) || text(move.label)
      || text(move.route) || 'Kept';
}

function moveWhy(move) {
  const r = move.reason;
  if (!r) return null;
  if (typeof r === 'string') return text(r);
  return text(r.user_text) || text(r.text);
}

// The human sentence lives at context.note ("Added while discussing …"). It
// already carries its own verb, so it is rendered as-is — prefixing it produced
// "Kept Added while discussing…" the moment the crash was fixed naively.
function moveMoment(move) {
  const r = move.reason;
  if (!r || typeof r === 'string') return null;
  const ctx = r.context;
  if (typeof ctx === 'string') return text(ctx);
  if (ctx && typeof ctx === 'object') return text(ctx.note) || text(ctx.moment);
  return text(r.moment);
}

export function KeptProjection({ record, company, onAccept, onAnswerClaim, t }) {
  const tk = tokens(t.theme);
  const tile = { kind: 'Record', token: 'plum', glyphKey: 'spv', title: "What you've kept" };
  const kept = (record?.shortlist ?? []).filter((m) => m && m.cer_id && (m.item || m.label || m.route));
  const open = (record?.proposals ?? []).filter((p) => p && p.id && text(p.title));
  const claims = (record?.claims ?? []).filter((c) => c && c.claim_id && c.label);

  return (
    <ProjectionShell tile={tile} company={company} attributedTo="leonardo" lastUpdated="live" t={t}>
      {/* Whose record this is, and how much of it is in their own words. Opened
          cold — a shared link, a second device — the page has to say this itself. */}
      {record?.company_name && (
        <div style={{
          fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, color: tk.inkSoft,
          letterSpacing: '0.06em', margin: '-18px 0 26px',
        }}>
          {text(record.company_name)}
          {(record.total_count ?? 0) > 0
            ? ` · ${record.confirmed_count ?? 0} of ${record.total_count} settled in your own words`
            : ''}
        </div>
      )}
      <p style={{ fontFamily: '"IBM Plex Sans", system-ui, sans-serif', fontSize: 16, lineHeight: 1.55, color: tk.inkMid, margin: '0 0 36px', maxWidth: 640 }}>
        {kept.length > 0
          ? 'Everything you have kept, with the reason it was offered and the conversation it came out of. Nothing here was chosen for you.'
          : 'Nothing kept yet. As you keep pathways from the conversation, they gather here with the reason each one was offered.'}
      </p>

      {kept.length > 0 && (
        <PSection kicker="Kept" title="In the order you kept them" source={`${kept.length} on your list`} t={t}>
          {kept.map((m, i) => {
            const why = moveWhy(m);
            const moment = moveMoment(m);
            return (
              <div key={m.cer_id} style={{
                padding: '20px 0',
                borderBottom: i < kept.length - 1 ? `1px solid ${tk.hairline}` : 'none',
                display: 'grid', gridTemplateColumns: '28px 1fr 1fr auto', gap: 16,
              }}>
                <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, color: tk.inkSoft, letterSpacing: '0.08em', paddingTop: 4 }}>{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 5, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: '"Instrument Serif", Georgia, serif', fontSize: 22, color: tk.ink, letterSpacing: '-0.01em' }}>{moveTitle(m)}</span>
                    {text(m.item?.category) && (
                      <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 9, color: tk.inkSoft, letterSpacing: '0.16em', textTransform: 'uppercase' }}>{text(m.item.category)}</span>
                    )}
                  </div>
                  {/* The route, as the smaller line beneath the thing kept. */}
                  {text(m.label) && text(m.label) !== moveTitle(m) && (
                    <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 9.5, fontWeight: 600, color: tk.umber, letterSpacing: '0.18em', textTransform: 'uppercase' }}>{text(m.label)}</div>
                  )}
                </div>
                <div>
                  {why && (
                    <div style={{ fontFamily: '"IBM Plex Sans", system-ui, sans-serif', fontSize: 13.5, color: tk.inkMid, lineHeight: 1.5, marginBottom: 8 }}>{why}</div>
                  )}
                  {moment && (
                    <div style={{ fontFamily: '"IBM Plex Sans", system-ui, sans-serif', fontStyle: 'italic', fontSize: 12.5, color: tk.inkSoft, lineHeight: 1.5 }}>{moment}</div>
                  )}
                </div>
                {/* The engagement portal: the one real next action for this route.
                    A route with no external_action renders nothing at all — never a
                    control that goes nowhere. */}
                {m.cta?.url ? (
                  <a
                    href={m.cta.url} target="_blank" rel="noopener noreferrer"
                    style={{
                      fontFamily: '"IBM Plex Mono", monospace', fontSize: 10.5,
                      color: tk.teal, textDecoration: 'none', whiteSpace: 'nowrap',
                      borderBottom: `1px solid ${tk.teal}55`, alignSelf: 'start', paddingTop: 4,
                    }}
                  >
                    {text(m.cta.label) || 'Open'} →
                  </a>
                ) : <span />}
              </div>
            );
          })}
        </PSection>
      )}

      {open.length > 0 && (
        <PSection kicker="Open" title="Open to you now" source={`${open.length} not yet kept`} t={t}>
          {open.map((p, i) => (
            <div key={p.id} style={{
              padding: '18px 0',
              borderBottom: i < open.length - 1 ? `1px solid ${tk.hairline}` : 'none',
              display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 16,
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: '"Instrument Serif", Georgia, serif', fontSize: 20, color: tk.ink }}>{text(p.title)}</span>
                  <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 9, color: tk.inkSoft, letterSpacing: '0.16em', textTransform: 'uppercase' }}>{text(p.kind)}</span>
                </div>
                {text(p.description) && (
                  <div style={{ fontFamily: '"IBM Plex Sans", system-ui, sans-serif', fontSize: 13, color: tk.inkMid, marginTop: 5 }}>{text(p.description)}</div>
                )}
              </div>
              <div style={{ fontFamily: '"IBM Plex Sans", system-ui, sans-serif', fontSize: 13, color: tk.inkSoft, lineHeight: 1.5, fontStyle: 'italic' }}>
                {text(p.reason)}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                {onAccept && (
                  <button
                    onClick={() => onAccept(p.id)}
                    style={{
                      fontFamily: '"IBM Plex Mono", monospace', fontSize: 10.5,
                      background: 'none', border: `1px solid ${tk.teal}55`, borderRadius: 4,
                      color: tk.teal, cursor: 'pointer', padding: '4px 10px', whiteSpace: 'nowrap',
                    }}
                  >
                    + Add to shortlist
                  </button>
                )}
                {p.url && (
                  <a
                    href={p.url} target="_blank" rel="noopener noreferrer"
                    style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, color: tk.inkSoft, textDecoration: 'none', whiteSpace: 'nowrap' }}
                  >
                    Read the original →
                  </a>
                )}
              </div>
            </div>
          ))}
        </PSection>
      )}

      {claims.length > 0 && (
        <PSection kicker="Evidence" title="What we've noted" source={`${record?.confirmed_count ?? 0} of ${record?.total_count ?? claims.length} in your own words`} t={t}>
          <ClaimStrip claims={claims} onAnswer={onAnswerClaim} light />
        </PSection>
      )}
    </ProjectionShell>
  );
}

export function Projection({ id, company, hiveStage, onBack, record, onAcceptProposal, onAnswerClaim, t }) {
  const tk = tokens(t.theme);
  const hive = company === 'hive';
  const stagePanel = hive ? HIVE_STAGES[hiveStage ?? 1]?.panel : null;

  const inner = id === 'kept'      ? <KeptProjection       record={record} company={company} onAccept={onAcceptProposal} onAnswerClaim={onAnswerClaim} t={t} />
              : id === 'investor'  ? <InvestorProjection   panel={stagePanel?.investor}  company={company} t={t} />
              : id === 'vendors'   ? <VendorsProjection    panel={stagePanel?.vendors}   company={company} t={t} />
              : id === 'aws'       ? <AwsProjection        panel={stagePanel?.aws}       company={company} t={t} />
              : id === 'microsoft' ? <MicrosoftProjection  panel={stagePanel?.microsoft} company={company} t={t} />
              : id === 'posture'   ? <PostureProjection    panel={stagePanel?.posture}   company={company} t={t} />
              : id === 'spv'       ? <SpvProjection        panel={stagePanel?.spv}       company={company} t={t} />
              : VENDOR_PAGES[id]   ? <VendorDetailProjection id={id} company={company} t={t} />
              : null;
  if (!inner) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {onBack && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '14px 48px 0',
        }}>
          <button
            onClick={onBack}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 10.5, color: tk.inkSoft, letterSpacing: '0.1em',
              padding: 0, transition: 'color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = tk.ink; }}
            onMouseLeave={e => { e.currentTarget.style.color = tk.inkSoft; }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M7.5 2.5 L3.5 6 L7.5 9.5" stroke="currentColor" strokeWidth="1.3"
                strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            The strategy room
          </button>
        </div>
      )}
      {inner}
    </div>
  );
}
