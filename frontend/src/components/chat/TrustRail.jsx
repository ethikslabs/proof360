const RAIL_WIDTH = 220;

function GhostBar({ width = '80%', error = false }) {
  return (
    <div style={{
      height: 6, borderRadius: 3, marginBottom: 8,
      width,
      background: error ? '#fca5a5' : '#e5e7eb',
      animation: error ? 'errorPulse 2s ease-in-out infinite' : 'ghostPulse 1.8s ease-in-out infinite',
    }} />
  );
}

function PanelSection({ title, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        fontSize: 9, fontWeight: 800, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: '#9ca3af', marginBottom: 8,
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function InferenceRow({ label, value }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 1 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{value}</div>
    </div>
  );
}

function GhostRail({ error }) {
  return (
    <div data-testid={error ? 'trust-rail-error' : 'trust-rail-ghost'}
      style={{
        width: RAIL_WIDTH,
        padding: '20px 14px',
        opacity: 0.22,
        filter: 'blur(0.5px)',
        transition: 'opacity 0.8s ease, filter 0.8s ease',
      }}
    >
      <style>{`
        @keyframes ghostPulse { 0%,100%{opacity:0.6} 50%{opacity:1} }
        @keyframes errorPulse  { 0%,100%{opacity:0.5} 50%{opacity:0.9} }
      `}</style>
      <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 10 }}>
        {error ? 'Analysis paused' : 'Building…'}
      </div>
      <GhostBar width="90%" error={error} />
      <GhostBar width="65%" error={error} />
      <GhostBar width="80%" error={error} />
      <div style={{ marginTop: 16 }}>
        <GhostBar width="100%" error={error} />
        <GhostBar width="55%" error={error} />
      </div>
    </div>
  );
}

function SolidRail({ companyData }) {
  const name = companyData?.inferences?.find(i => i.field === 'company_name')?.value ?? '—';
  const stage = companyData?.inferences?.find(i => i.field === 'stage')?.value ?? '—';
  const type = companyData?.inferences?.find(i => i.field === 'product_type')?.value ?? '—';

  return (
    <div data-testid="trust-rail-solid"
      style={{
        width: RAIL_WIDTH,
        padding: '20px 14px',
        opacity: 1,
        filter: 'none',
        transition: 'opacity 1.2s ease, filter 1.2s ease',
      }}
    >
      <PanelSection title="Company">
        <InferenceRow label="Name" value={name} />
        <InferenceRow label="Stage" value={stage} />
        <InferenceRow label="Type" value={type} />
      </PanelSection>

      {companyData?.readiness && (
        <PanelSection title="Readiness">
          {Object.entries(companyData.readiness).map(([k, v]) => (
            <InferenceRow key={k} label={k.replace(/_/g, ' ')} value={`${v}%`} />
          ))}
        </PanelSection>
      )}

      {companyData?.gaps?.length > 0 && (
        <PanelSection title="Gaps">
          {companyData.gaps.slice(0, 4).map(g => (
            <div key={g.id} style={{
              fontSize: 11, color: '#dc2626', padding: '3px 0',
              borderBottom: '1px solid #fee2e2',
            }}>
              {g.label ?? g.id}
            </div>
          ))}
        </PanelSection>
      )}
    </div>
  );
}

export function TrustRail({ trustPhase, companyData, inferenceError = false }) {
  if (trustPhase === 't0') return null;

  const isGhost = trustPhase === 't1' || trustPhase === 't05';
  const isSolid = trustPhase === 't2' || trustPhase === 'tn';

  return (
    <div style={{
      width: RAIL_WIDTH,
      flexShrink: 0,
      borderRight: '1px solid #f3f4f6',
      overflowY: 'auto',
      background: '#fafafa',
    }}>
      {isGhost && <GhostRail error={inferenceError} />}
      {isSolid && companyData && <SolidRail companyData={companyData} />}
    </div>
  );
}
