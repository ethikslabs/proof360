import { FONT } from '../../tokens.js';
import { fmtRegisterDate, modelAnswerLine, dataAnswerLine } from '../../utils/advisory.js';

// The register-advisory answer, IN the conversation stream (advisory law 1 — never a
// banner or module). Renders the four ratified laws as they arrive in the API shape:
//   law 2 — the honest zero is a confident answer with provenance chips
//   law 3 — free matches arrive pre-sorted free-first (service-enforced; we just render)
//   law 4 — the paid rail sits BELOW the free answer, customer's own billing frame,
//           margin disclosed. It is styled as a quiet rail, never a push.

function Chip({ tk, children }) {
  return (
    <span style={{
      fontFamily: FONT.mono, fontSize: 10, color: tk.inkMid, background: tk.bgTint,
      border: `1px solid ${tk.hairline}`, borderRadius: 6, padding: '3px 7px', whiteSpace: 'nowrap',
    }}>{children}</span>
  );
}

export function AdvisoryCard({ advisory, tk }) {
  const { models, data } = advisory;
  return (
    <div style={{ border: `1px solid ${tk.hairline}`, borderRadius: 14, background: tk.surface, padding: 16, maxWidth: 560 }}>
      <div style={{ fontFamily: FONT.mono, fontSize: 10, letterSpacing: '0.08em', color: tk.teal, textTransform: 'uppercase', marginBottom: 10 }}>
        Register advisory · retrieved, not pitched
      </div>

      {/* models — the honest zero lands here as an answer */}
      <p style={{ fontFamily: FONT.sans, fontSize: 13.5, color: tk.ink, margin: '0 0 8px', lineHeight: 1.5 }}>
        {modelAnswerLine(models)}
      </p>
      {models.match_count > 0 && (
        <div style={{ marginBottom: 8 }}>
          {models.matches.map((m) => (
            <div key={`${m.source}:${m.model_id}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '6px 0', borderBottom: `1px dotted ${tk.hairline}` }}>
              <span style={{ fontFamily: FONT.sans, fontSize: 12.5, color: tk.inkMid }}>{m.name}</span>
              <span style={{ fontFamily: FONT.mono, fontSize: 10.5, color: tk.inkSoft }}>{m.provider} · {m.source}</span>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        <Chip tk={tk}>{models.total} models</Chip>
        <Chip tk={tk}>{models.sources} sources</Chip>
        <Chip tk={tk}>derived {fmtRegisterDate(models.derived_at)}</Chip>
      </div>

      {/* data — the shopping list, free first (pre-sorted by the service) */}
      <p style={{ fontFamily: FONT.sans, fontSize: 13.5, color: tk.ink, margin: '0 0 8px', lineHeight: 1.5 }}>
        {dataAnswerLine(data)}
      </p>
      {data.matches.map((d) => (
        <div key={d.dataset_id} style={{ padding: '8px 0', borderBottom: `1px dotted ${tk.hairline}` }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <a href={d.link || '#!'} target="_blank" rel="noreferrer" style={{ fontFamily: FONT.sans, fontSize: 13, fontWeight: 600, color: tk.ink, textDecoration: 'none', borderBottom: `1px solid ${tk.hairStrong}` }}>
              {d.name}
            </a>
            <span style={{
              fontFamily: FONT.mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em',
              color: d.commercial === 'free' ? tk.sevOk : tk.umber,
            }}>{d.commercial}{d.commercial === 'free' ? ' · $0' : ''}</span>
          </div>
          <p style={{ fontFamily: FONT.sans, fontSize: 12, color: tk.inkSoft, margin: '4px 0 0', lineHeight: 1.45 }}>{d.description}…</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
            {d.tags.map((t) => <Chip key={t} tk={tk}>{t}</Chip>)}
          </div>
        </div>
      ))}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '10px 0 0' }}>
        <Chip tk={tk}>{data.total} free datasets</Chip>
        <Chip tk={tk}>derived {fmtRegisterDate(data.derived_at)}</Chip>
        <Chip tk={tk}>source: registry.opendata.aws</Chip>
      </div>

      {/* law 4 — the paid rail, BELOW the answer, customer's own billing frame */}
      <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${tk.hairline}` }}>
        <span style={{ fontFamily: FONT.mono, fontSize: 10.5, color: tk.inkSoft, lineHeight: 1.6 }}>
          Need commercial data beyond the free register? <b style={{ color: tk.inkMid, fontWeight: 600 }}>{data.paid_rail.label}</b> — paid,
          bills to <b style={{ color: tk.inkMid, fontWeight: 600 }}>your own AWS account</b> (burns down your committed spend), our margin {data.paid_rail.margin}.
        </span>
      </div>
    </div>
  );
}
