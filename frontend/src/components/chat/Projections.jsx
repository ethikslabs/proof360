import { tokens, PERSONA } from '../../tokens.js';
import { SPACE_GLYPHS } from '../../glyphs.jsx';
import { HIVE_STAGES } from '../../data/mock/hive.js';

function SeverityDot({ severity, t }) {
  const tk = tokens(t.theme);
  const c = severity === 'high'   ? tk.sevHigh
          : severity === 'medium' ? tk.sevMed
          : severity === 'ok'     ? tk.sevOk : tk.inkGhost;
  return <span style={{ width: 7, height: 7, borderRadius: '50%', background: c, display: 'inline-block' }} />;
}

function ScoreRing({ value, max = 100, size = 132, color, label, t }) {
  const tk = tokens(t.theme);
  const r = (size - 14) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * (value / max);
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={tk.hairline} strokeWidth="3"/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={`${dash} ${c}`} strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}/>
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          fontFamily: '"Instrument Serif", Georgia, serif',
          fontSize: size * 0.36, color: tk.ink, lineHeight: 1, letterSpacing: '-0.02em',
        }}>{value}</div>
        <div style={{
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: 9.5, color: tk.inkSoft, letterSpacing: '0.16em',
          textTransform: 'uppercase', marginTop: 4,
        }}>{label || `/ ${max}`}</div>
      </div>
    </div>
  );
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
              fontFamily: '"Instrument Serif", Georgia, serif',
              fontStyle: 'italic', fontSize: 15, color: tk.inkMid,
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
        <ScoreRing value={d.score} color={color} t={t} />
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
                <div style={{ fontFamily: '"Instrument Serif", Georgia, serif', fontStyle: 'italic', fontSize: 12.5, color: tk.inkMid }}>{e.note}</div>
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
      <p style={{ fontFamily: '"Instrument Serif", Georgia, serif', fontStyle: 'italic', fontSize: 20, lineHeight: 1.4, color: tk.inkMid, margin: '0 0 36px', maxWidth: 640 }}>
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
              display: 'grid', gridTemplateColumns: '28px 1fr 1fr', gap: 16,
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
                <div style={{ fontFamily: '"Instrument Serif", Georgia, serif', fontStyle: 'italic', fontSize: 15, color: tk.inkMid, lineHeight: 1.5, marginBottom: 8 }}>{v.why}</div>
                <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 9.5, color: tk.inkSoft, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Addresses · {v.addresses}</div>
              </div>
            </div>
          ))}
        </PSection>
      )}
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
  const tile = { kind: 'Programs', token: 'teal', glyphKey: 'aws', title: 'AWS programs matched to your stage' };
  const d = panel ?? YOURS_AWS;
  const statusColor = (s) => s === 'available' ? tk.sevOk : s === 'eligible' ? tk.umber : tk.inkSoft;
  const statusLabel = (s) => s === 'available' ? 'Available' : s === 'eligible' ? 'Eligible' : 'Not enrolled';

  return (
    <ProjectionShell tile={tile} company={company} attributedTo="edison" lastUpdated="9m ago" t={t}>
      <p style={{ fontFamily: '"Instrument Serif", Georgia, serif', fontStyle: 'italic', fontSize: 20, lineHeight: 1.4, color: tk.inkMid, margin: '0 0 36px', maxWidth: 640 }}>
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
                  <span style={{ fontFamily: '"Instrument Serif", Georgia, serif', fontSize: 18, color: tk.ink, letterSpacing: '-0.005em' }}>{p.name}</span>
                  <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 9.5, color: statusColor(p.status), letterSpacing: '0.16em', textTransform: 'uppercase' }}>{statusLabel(p.status)}</span>
                </div>
                <div style={{ fontFamily: '"Instrument Serif", Georgia, serif', fontStyle: 'italic', fontSize: 14, color: tk.inkMid }}>{p.value} · {p.detail}</div>
              </div>
              {(p.status === 'available' || p.status === 'eligible') && (
                <a href="https://meetings.hubspot.com/john3174" target="_blank" rel="noopener noreferrer" style={{ alignSelf: 'center', fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, color: tk.teal, borderBottom: `1px solid ${tk.teal}66`, paddingBottom: 1, letterSpacing: '0.04em', textDecoration: 'none' }}>Apply →</a>
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
      <p style={{ fontFamily: '"Instrument Serif", Georgia, serif', fontStyle: 'italic', fontSize: 20, lineHeight: 1.4, color: tk.inkMid, margin: '0 0 36px', maxWidth: 640 }}>
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
                  <span style={{ fontFamily: '"Instrument Serif", Georgia, serif', fontSize: 18, color: tk.ink, letterSpacing: '-0.005em' }}>{p.name}</span>
                  <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 9.5, color: statusColor(p.status), letterSpacing: '0.16em', textTransform: 'uppercase' }}>{statusLabel(p.status)}</span>
                </div>
                <div style={{ fontFamily: '"Instrument Serif", Georgia, serif', fontStyle: 'italic', fontSize: 14, color: tk.inkMid }}>{p.value} · {p.detail}</div>
              </div>
              {(p.status === 'available' || p.status === 'eligible') && (
                <a href="https://meetings.hubspot.com/john3174" target="_blank" rel="noopener noreferrer" style={{ alignSelf: 'center', fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, color: tk.teal, borderBottom: `1px solid ${tk.teal}66`, paddingBottom: 1, letterSpacing: '0.04em', textDecoration: 'none' }}>Apply →</a>
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
      <p style={{ fontFamily: '"Instrument Serif", Georgia, serif', fontStyle: 'italic', fontSize: 20, lineHeight: 1.4, color: tk.inkMid, margin: '0 0 36px', maxWidth: 640 }}>
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
      <p style={{ fontFamily: '"Instrument Serif", Georgia, serif', fontStyle: 'italic', fontSize: 20, lineHeight: 1.4, color: tk.inkMid, margin: '0 0 36px', maxWidth: 640 }}>
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

export function Projection({ id, company, hiveStage, onBack, t }) {
  const tk = tokens(t.theme);
  const hive = company === 'hive';
  const stagePanel = hive ? HIVE_STAGES[hiveStage ?? 1]?.panel : null;

  const inner = id === 'investor'  ? <InvestorProjection   panel={stagePanel?.investor}  company={company} t={t} />
              : id === 'vendors'   ? <VendorsProjection    panel={stagePanel?.vendors}   company={company} t={t} />
              : id === 'aws'       ? <AwsProjection        panel={stagePanel?.aws}       company={company} t={t} />
              : id === 'microsoft' ? <MicrosoftProjection  panel={stagePanel?.microsoft} company={company} t={t} />
              : id === 'posture'   ? <PostureProjection    panel={stagePanel?.posture}   company={company} t={t} />
              : id === 'spv'       ? <SpvProjection        panel={stagePanel?.spv}       company={company} t={t} />
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
