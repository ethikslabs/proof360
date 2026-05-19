import { tokens, PERSONA } from '../../tokens.js';
import { SPACE_GLYPHS } from '../../glyphs.jsx';

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

function ProjectionShell({ tile, attributedTo, lastUpdated, children, t }) {
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

function InvestorProjection({ t }) {
  const tk = tokens(t.theme);
  const color = tk.plum;
  const tile = { kind: 'Investor', token: 'plum', glyphKey: 'investor', title: 'Investor Readiness' };

  const gaps = [
    { label: 'No SOC 2 evidence',          severity: 'high',   source: 'Posture · 4m ago' },
    { label: 'Breach exposure public',     severity: 'high',   source: 'Have I Been Pwned · 18m ago' },
    { label: 'SSL misconfiguration',       severity: 'medium', source: 'Cloudflare · 6m ago' },
    { label: 'No access control evidence', severity: 'high',   source: 'manual · not yet checked' },
  ];

  const evidence = [
    { label: 'Pen test',          state: 'scheduled', note: 'Q2 · CrowdStrike' },
    { label: 'Cyber insurance',   state: 'active',    note: 'Coalition · renewed Mar' },
    { label: 'Privacy policy',    state: 'active',    note: 'reviewed Apr' },
    { label: 'SOC 2 Type I',      state: 'missing',   note: 'no auditor engaged' },
    { label: 'Cap table',         state: 'active',    note: 'Carta · synced 09:14' },
    { label: 'Founder background', state: 'active',   note: 'public' },
  ];

  const investorQuestions = [
    'How long until SOC 2 evidence is in the data room?',
    "What's your runway versus your remediation timeline?",
    'Who owns access control if your CTO is unavailable?',
    'What signals from your competitors are you tracking?',
  ];

  const activity = [
    { ts: '09:17', who: 'Edison',   what: 'flagged SSL misconfiguration on api.proof360.app' },
    { ts: '09:15', who: 'Sophia',   what: 'recomputed trust score · 68 → 72' },
    { ts: '09:14', who: 'Leonardo', what: 'drafted opening line for investor narrative' },
    { ts: '09:13', who: 'Edison',   what: 'pulled fresh posture scan' },
    { ts: 'Yesterday', who: 'Sophia', what: 'compared to 14 peer startups at seed stage' },
  ];

  const stateChip = (state) => {
    const c = state === 'active'    ? tk.sevOk
            : state === 'scheduled' ? tk.umber
            : state === 'missing'   ? tk.sevHigh : tk.inkSoft;
    const label = { active: 'Active', scheduled: 'Scheduled', missing: 'Missing' }[state] || state;
    return { c, label };
  };

  const personaKey = (name) => name.toLowerCase() === 'sophia' ? 'sofia' : name.toLowerCase();

  return (
    <ProjectionShell tile={tile} attributedTo="sofia" lastUpdated="2m ago" t={t}>
      <div style={{
        display: 'flex', gap: 32, alignItems: 'center',
        padding: '28px 32px',
        background: tk.surface, border: `1px solid ${tk.hairline}`,
        borderRadius: 16, marginBottom: 44,
      }}>
        <ScoreRing value={72} color={color} t={t} />
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: 10, fontWeight: 600, color: tk.inkSoft,
            letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 9,
          }}>Where you stand</div>
          <p style={{
            fontFamily: '"Instrument Serif", Georgia, serif',
            fontSize: 22, lineHeight: 1.4, color: tk.ink,
            letterSpacing: '-0.005em', margin: '0 0 12px',
          }}>Above the line. The four gaps below decide it — close enough to a term sheet that <span style={{ fontStyle: 'italic', color }}>timing matters more than story</span> now.</p>
          <div style={{ fontFamily: '"IBM Plex Sans", system-ui, sans-serif', fontSize: 12, color: tk.inkSoft, letterSpacing: '0.04em' }}>
            <span>+4 since last week</span>
            <span style={{ margin: '0 10px', color: tk.inkGhost }}>·</span>
            <span>peer startups at seed average 64</span>
          </div>
        </div>
      </div>

      <PSection kicker="What's stopping the wire" title="Gaps to close" source="from Posture · live" t={t}>
        {gaps.map((g, i) => (
          <div key={g.label} style={{
            display: 'grid', gridTemplateColumns: '10px 1fr auto auto',
            alignItems: 'center', gap: 14, padding: '13px 0',
            borderBottom: i < gaps.length - 1 ? `1px solid ${tk.hairline}` : 'none',
          }}>
            <SeverityDot severity={g.severity} t={t} />
            <span style={{ fontSize: 14.5, color: tk.ink }}>{g.label}</span>
            <span style={{
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 9.5, color: g.severity === 'high' ? tk.sevHigh : tk.sevMed,
              letterSpacing: '0.16em', textTransform: 'uppercase',
            }}>{g.severity}</span>
            <span style={{
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 10, color: tk.inkSoft, letterSpacing: '0.04em', textAlign: 'right',
            }}>{g.source}</span>
          </div>
        ))}
      </PSection>

      <PSection kicker="What you have" title="Evidence layer" source="6 attested · 1 missing" t={t}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {evidence.map(e => {
            const { c, label } = stateChip(e.state);
            return (
              <div key={e.label} style={{
                padding: '14px 16px',
                background: tk.surfaceLo, border: `1px solid ${tk.hairline}`, borderRadius: 10,
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: tk.ink }}>{e.label}</span>
                  <span style={{
                    fontFamily: '"IBM Plex Mono", monospace',
                    fontSize: 9.5, color: c, letterSpacing: '0.14em', textTransform: 'uppercase',
                  }}>{label}</span>
                </div>
                <div style={{ fontFamily: '"Instrument Serif", Georgia, serif', fontStyle: 'italic', fontSize: 12.5, color: tk.inkMid }}>{e.note}</div>
              </div>
            );
          })}
        </div>
      </PSection>

      <PSection kicker="What investors would ask" title="The questions you're being graded on" source="Leonardo · drafted" t={t}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {investorQuestions.map((q, i) => (
            <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', paddingLeft: 18, position: 'relative' }}>
              <span style={{ position: 'absolute', left: 0, top: -4, fontFamily: '"Instrument Serif", Georgia, serif', fontSize: 24, color, opacity: 0.6 }}>&ldquo;</span>
              <span style={{ fontFamily: '"Instrument Serif", Georgia, serif', fontStyle: 'italic', fontSize: 17.5, color: tk.ink, lineHeight: 1.4, letterSpacing: '-0.005em' }}>{q}</span>
            </div>
          ))}
        </div>
      </PSection>

      <PSection kicker="What's been happening here" title="Activity log" source={`${activity.length} events`} t={t}>
        {activity.map((a, i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '64px 76px 1fr',
            gap: 16, padding: '11px 0',
            borderBottom: i < activity.length - 1 ? `1px solid ${tk.hairline}` : 'none',
            alignItems: 'baseline',
          }}>
            <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, color: tk.inkSoft, letterSpacing: '0.04em' }}>{a.ts}</span>
            <span style={{
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 9.5, fontWeight: 600,
              color: tk[PERSONA[personaKey(a.who)]?.token] || tk.inkMid,
              letterSpacing: '0.18em', textTransform: 'uppercase',
            }}>{a.who}</span>
            <span style={{ fontSize: 13.5, color: tk.ink, lineHeight: 1.5 }}>{a.what}</span>
          </div>
        ))}
      </PSection>
    </ProjectionShell>
  );
}

function VendorsProjection({ t }) {
  const tk = tokens(t.theme);
  const tile = { kind: 'Vendors', token: 'umber', glyphKey: 'vendors', title: 'Vendors matched to your gaps' };

  const vendors = [
    { name: 'Vanta',      category: 'Compliance', priority: 'start_here',  why: 'Closes the SOC 2 gap fastest at this stage',               addresses: 'No SOC 2 evidence' },
    { name: 'Cloudflare', category: 'Security',   priority: 'recommended', why: 'Fixes SSL + breach exposure in the same pass',             addresses: 'SSL misconfiguration · Breach exposure' },
    { name: 'Drata',      category: 'Compliance', priority: 'recommended', why: 'Alternative to Vanta if you want auditor flexibility',     addresses: 'No SOC 2 evidence' },
    { name: 'Sumsub',     category: 'KYC',        priority: 'considered',  why: 'Only if you raise overseas this round',                    addresses: 'Future · enterprise contracts' },
  ];
  const priorityColor = (p) => p === 'start_here' ? tk.plum : p === 'recommended' ? tk.umber : tk.inkSoft;
  const priorityLabel = (p) => p === 'start_here' ? 'Start here' : p === 'recommended' ? 'Recommended' : 'Considered';

  return (
    <ProjectionShell tile={tile} attributedTo="leonardo" lastUpdated="6m ago" t={t}>
      <p style={{ fontFamily: '"Instrument Serif", Georgia, serif', fontStyle: 'italic', fontSize: 20, lineHeight: 1.4, color: tk.inkMid, margin: '0 0 36px', maxWidth: 640 }}>
        Four names. The sequence is the signal — what you adopt first tells buyers and investors what you&apos;re prioritising.
      </p>
      <PSection kicker="Shortlist" title="In order of sequence" source="matched to 4 gaps" t={t}>
        {vendors.map((v, i) => (
          <div key={v.name} style={{
            padding: '20px 0',
            borderBottom: i < vendors.length - 1 ? `1px solid ${tk.hairline}` : 'none',
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
    </ProjectionShell>
  );
}

function AwsProjection({ t }) {
  const tk = tokens(t.theme);
  const tile = { kind: 'Programs', token: 'teal', glyphKey: 'aws', title: 'AWS programs matched to your stage' };

  const programs = [
    { name: 'AWS Activate',       status: 'not_enrolled', value: 'Up to $5k credits', detail: 'Apply via portfolio program',       eligible: false },
    { name: 'AWS ISV Accelerate', status: 'eligible',     value: 'Co-sell motion',    detail: 'Listed in Marketplace required',   eligible: true  },
    { name: 'Startup Credits',    status: 'available',    value: '$10k unclaimed',    detail: 'Available now · expires Q4',       eligible: true  },
    { name: 'Well-Architected',   status: 'available',    value: 'Free review',       detail: 'Schedule via solutions architect', eligible: true  },
  ];
  const statusColor = (s) => s === 'available' ? tk.sevOk : s === 'eligible' ? tk.umber : tk.inkSoft;
  const statusLabel = (s) => s === 'available' ? 'Available' : s === 'eligible' ? 'Eligible' : 'Not enrolled';

  return (
    <ProjectionShell tile={tile} attributedTo="edison" lastUpdated="9m ago" t={t}>
      <p style={{ fontFamily: '"Instrument Serif", Georgia, serif', fontStyle: 'italic', fontSize: 20, lineHeight: 1.4, color: tk.inkMid, margin: '0 0 36px', maxWidth: 640 }}>
        Two of these need an application this quarter. The other two are sitting there.
      </p>
      <PSection kicker="Programs" title="Where you can apply now" source="AWS marketplace · live" t={t}>
        {programs.map((p, i) => (
          <div key={p.name} style={{
            padding: '18px 0',
            borderBottom: i < programs.length - 1 ? `1px solid ${tk.hairline}` : 'none',
            display: 'grid', gridTemplateColumns: '1fr auto', gap: 12,
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
                <span style={{ fontFamily: '"Instrument Serif", Georgia, serif', fontSize: 18, color: tk.ink, letterSpacing: '-0.005em' }}>{p.name}</span>
                <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 9.5, color: statusColor(p.status), letterSpacing: '0.16em', textTransform: 'uppercase' }}>{statusLabel(p.status)}</span>
              </div>
              <div style={{ fontFamily: '"Instrument Serif", Georgia, serif', fontStyle: 'italic', fontSize: 14, color: tk.inkMid }}>{p.value} · {p.detail}</div>
            </div>
            {p.eligible && (
              <span style={{ alignSelf: 'center', fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, color: tk.teal, cursor: 'pointer', borderBottom: `1px solid ${tk.teal}66`, paddingBottom: 1, letterSpacing: '0.04em' }}>Apply →</span>
            )}
          </div>
        ))}
      </PSection>
    </ProjectionShell>
  );
}

function PostureProjection({ t }) {
  const tk = tokens(t.theme);
  const tile = { kind: 'Posture', token: 'teal', glyphKey: 'posture', title: 'Live security posture' };

  const items = [
    { label: 'SSL / TLS',       status: 'Issues found',      severity: 'high',    source: 'Cloudflare · 6m ago' },
    { label: 'Access Control',  status: 'No evidence',       severity: 'high',    source: 'manual · not checked' },
    { label: 'Breach Monitor',  status: 'Exposure detected', severity: 'high',    source: 'HIBP · 18m ago' },
    { label: 'Data Privacy',    status: 'Unknown',           severity: 'unknown', source: 'no integration' },
    { label: 'MFA Enforcement', status: 'Not configured',    severity: 'medium',  source: 'Okta · 1h ago' },
    { label: 'DNS Hardening',   status: 'Partial',           severity: 'medium',  source: 'Cloudflare · 6m ago' },
    { label: 'Backup Recovery', status: 'Verified',          severity: 'ok',      source: 'AWS · 4h ago' },
  ];
  const sevColor = (s) => s === 'high' ? tk.sevHigh : s === 'medium' ? tk.sevMed : s === 'ok' ? tk.sevOk : tk.inkGhost;

  return (
    <ProjectionShell tile={tile} attributedTo="edison" lastUpdated="6m ago" t={t}>
      <p style={{ fontFamily: '"Instrument Serif", Georgia, serif', fontStyle: 'italic', fontSize: 20, lineHeight: 1.4, color: tk.inkMid, margin: '0 0 36px', maxWidth: 640 }}>
        Three high. Three medium. One verified. The high ones are what investors see first.
      </p>
      <PSection kicker="Checks" title="What's running right now" source="7 integrations · live" t={t}>
        {items.map((it, i) => (
          <div key={it.label} style={{
            display: 'grid', gridTemplateColumns: '14px 1fr auto auto',
            alignItems: 'center', gap: 14, padding: '13px 0',
            borderBottom: i < items.length - 1 ? `1px solid ${tk.hairline}` : 'none',
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

function SpvProjection({ t }) {
  const tk = tokens(t.theme);
  const tile = { kind: 'SPV', token: 'plum', glyphKey: 'spv', title: 'Your operational passport' };

  const state = [
    { label: 'Entity status',  value: 'Not registered', color: tk.umber  },
    { label: 'Trust score',    value: '72 / 100',       color: tk.plum   },
    { label: 'Attestations',   value: '0 filed',        color: tk.inkSoft },
    { label: 'Investor links', value: '0 sent',         color: tk.inkSoft },
    { label: 'Last updated',   value: 'Just now',       color: tk.inkSoft },
  ];

  const fragments = [
    { ts: '09:17', who: 'Edison',   what: 'Posture scan returned' },
    { ts: '09:16', who: 'Edison',   what: 'AWS eligibility checked' },
    { ts: '09:15', who: 'Sophia',   what: 'Vendor shortlist drafted' },
    { ts: '09:14', who: 'Sophia',   what: 'Trust score computed' },
  ];

  const personaKey = (name) => name.toLowerCase() === 'sophia' ? 'sofia' : name.toLowerCase();

  return (
    <ProjectionShell tile={tile} attributedTo="leonardo" lastUpdated="just now" t={t}>
      <p style={{ fontFamily: '"Instrument Serif", Georgia, serif', fontStyle: 'italic', fontSize: 20, lineHeight: 1.4, color: tk.inkMid, margin: '0 0 36px', maxWidth: 640 }}>
        A picture of you, not a file. The room remembers — each turn adds a fragment.
      </p>
      <PSection kicker="Current state" title="What the passport says today" t={t}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {state.map(s => (
            <div key={s.label} style={{
              padding: '16px 18px',
              background: tk.surfaceLo, border: `1px solid ${tk.hairline}`, borderRadius: 10,
            }}>
              <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 9.5, color: tk.inkSoft, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontFamily: '"Instrument Serif", Georgia, serif', fontSize: 22, color: s.color, letterSpacing: '-0.01em' }}>{s.value}</div>
            </div>
          ))}
        </div>
      </PSection>
      <PSection kicker="Accumulated this session" title="Fragments added today" source={`${fragments.length} events`} t={t}>
        {fragments.map((f, i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '64px 76px 1fr',
            gap: 16, padding: '11px 0',
            borderBottom: i < fragments.length - 1 ? `1px solid ${tk.hairline}` : 'none',
            alignItems: 'baseline',
          }}>
            <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, color: tk.inkSoft, letterSpacing: '0.04em' }}>{f.ts}</span>
            <span style={{
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 9.5, fontWeight: 600,
              color: tk[PERSONA[personaKey(f.who)]?.token] || tk.inkMid,
              letterSpacing: '0.18em', textTransform: 'uppercase',
            }}>{f.who}</span>
            <span style={{ fontSize: 13.5, color: tk.ink }}>{f.what}</span>
          </div>
        ))}
      </PSection>
    </ProjectionShell>
  );
}

export function Projection({ id, t }) {
  if (id === 'investor') return <InvestorProjection t={t} />;
  if (id === 'vendors')  return <VendorsProjection  t={t} />;
  if (id === 'aws')      return <AwsProjection      t={t} />;
  if (id === 'posture')  return <PostureProjection  t={t} />;
  if (id === 'spv')      return <SpvProjection      t={t} />;
  return null;
}
