// "Our working" — the provenance ledger row (John mint 2026-08-23; provenance UX brief).
// The familiar AI-thinking accordion repurposed: we collapse RETRIEVAL (auditable),
// not reasoning. Every line is TRUE — derived from the actual receipt of calls made,
// never decorative. Zero hits renders as honest degradation, not silence.
//
// receipt: { ts, query, hits: [{ n, slug, layer, evidence_id, score, excerpt,
//                                source_url, fetched_at }] }
import { useState } from 'react';

function holdingLine(hit) {
  // How we hold it — corpus holding + fetched date when we have one.
  const fetched = hit.fetched_at
    ? new Date(hit.fetched_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;
  return fetched ? `Corpus holding · fetched ${fetched}` : 'Corpus holding';
}

function CitationCard({ hit, tk }) {
  return (
    <div style={{
      margin: '6px 0 10px 22px',
      padding: '10px 12px',
      borderLeft: `2px solid ${tk?.teal ?? '#0f766e'}`,
      background: 'rgba(127,127,127,0.06)',
      borderRadius: '0 6px 6px 0',
    }}>
      {hit.excerpt && (
        <div style={{
          fontFamily: '"Instrument Serif", Georgia, serif',
          fontStyle: 'italic', fontSize: 13.5, lineHeight: 1.55,
          color: tk?.ink ?? '#1f2430', marginBottom: 8,
        }}>
          “{hit.excerpt}”
        </div>
      )}
      <div style={{
        fontFamily: '"IBM Plex Mono", monospace', fontSize: 10,
        color: tk?.inkSoft ?? '#94a3b8', letterSpacing: '0.06em',
      }}>
        {holdingLine(hit)}
      </div>
      {hit.source_url && (
        <a
          href={hit.source_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          style={{
            display: 'inline-block', marginTop: 6,
            fontFamily: '"IBM Plex Mono", monospace', fontSize: 10.5,
            color: tk?.teal ?? '#0f766e', textDecoration: 'none',
            borderBottom: `1px solid ${(tk?.teal ?? '#0f766e')}66`,
          }}
        >
          Read the original →
        </a>
      )}
    </div>
  );
}

export function OurWorking({ receipt, tk }) {
  const [open, setOpen] = useState(false);
  const [openHit, setOpenHit] = useState(null);
  if (!receipt) return null;

  const hits = receipt.hits || [];
  const summary = hits.length > 0
    ? `Our working · ${hits.length} source${hits.length === 1 ? '' : 's'}`
    : 'Our working · no sources retrieved';

  return (
    <div style={{ margin: '2px 0 10px 44px', maxWidth: 560 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
          fontFamily: '"IBM Plex Mono", monospace', fontSize: 10,
          letterSpacing: '0.08em', color: tk?.inkSoft ?? '#94a3b8',
          display: 'flex', alignItems: 'center', gap: 6,
        }}
      >
        <span style={{
          display: 'inline-block',
          transform: open ? 'rotate(90deg)' : 'none',
          transition: 'transform 0.15s ease',
          fontSize: 8,
        }}>▸</span>
        {summary}
      </button>

      {open && (
        <div style={{ marginTop: 6 }}>
          {hits.length === 0 && (
            <div style={{
              fontFamily: '"IBM Plex Sans", system-ui, sans-serif', fontSize: 11.5,
              color: tk?.inkSoft ?? '#94a3b8', fontStyle: 'italic', paddingLeft: 14,
            }}>
              This answer drew no corpus sources — it is the model speaking from the
              conversation alone.
            </div>
          )}
          {hits.map((hit) => (
            <div key={hit.n ?? hit.evidence_id}>
              <button
                onClick={() => setOpenHit(openHit === hit.n ? null : hit.n)}
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  display: 'flex', gap: 8, alignItems: 'baseline',
                  padding: '3px 0 3px 14px', textAlign: 'left', width: '100%',
                }}
              >
                <span style={{
                  fontFamily: '"IBM Plex Mono", monospace', fontSize: 10,
                  color: tk?.teal ?? '#0f766e', flexShrink: 0,
                }}>[{hit.n}]</span>
                <span style={{
                  fontFamily: '"IBM Plex Sans", system-ui, sans-serif', fontSize: 11.5,
                  color: tk?.inkMid ?? '#64748b',
                }}>
                  {hit.slug}
                  {hit.layer ? (
                    <span style={{ color: tk?.inkSoft ?? '#94a3b8' }}> · {hit.layer}</span>
                  ) : null}
                </span>
              </button>
              {openHit === hit.n && <CitationCard hit={hit} tk={tk} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
