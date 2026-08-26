// "Our working" — the provenance ledger row (John mint 2026-08-23; provenance UX brief).
// The familiar AI-thinking accordion repurposed: we collapse RETRIEVAL (auditable),
// not reasoning. Every line is TRUE — derived from the actual receipt of calls made,
// never decorative. Zero hits renders as honest degradation, not silence.
//
// receipt: { ts, query, hits: [{ n, slug, layer, evidence_id, score, excerpt,
//                                source_url, fetched_at }] }
import { useState } from 'react';
import { tidyExcerpt } from '../../rendering/tidyExcerpt.js';
import { sensitivityOf } from '../../rendering/sensitivity.js';

function holdingLine(hit) {
  // How we hold it — corpus holding + fetched date when we have one.
  const fetched = hit.fetched_at
    ? new Date(hit.fetched_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;
  return fetched ? `Corpus holding · fetched ${fetched}` : 'Corpus holding';
}

function publisherOf(hit) {
  if (hit.source_url) {
    try { return new URL(hit.source_url).hostname.replace(/^www\./, ''); } catch { /* fall through */ }
  }
  return null;
}

// One row per DOCUMENT (slug), chunks kept in first-seen order with their
// original n — inline [n] citations in chat answers must keep resolving.
function groupBySlug(hits) {
  const groups = [];
  const bySlug = new Map();
  for (const hit of hits) {
    // Key falls back per-hit when slug is absent — unrelated documents must
    // never merge into one row under one publisher's name (provenance).
    const key = hit.slug ?? hit.evidence_id ?? hit.n;
    let g = bySlug.get(key);
    if (!g) { g = { key, slug: hit.slug, layer: hit.layer, hits: [] }; bySlug.set(key, g); groups.push(g); }
    g.hits.push(hit);
  }
  return groups;
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
          “{tidyExcerpt(hit.excerpt)}”
        </div>
      )}
      <div style={{
        fontFamily: '"IBM Plex Mono", monospace', fontSize: 10,
        color: tk?.inkSoft ?? '#94a3b8', letterSpacing: '0.06em',
      }}>
        <div>{holdingLine(hit)}</div>
        <div>{hit.slug}</div>
      </div>
      {(() => {
        const mark = sensitivityOf(hit);
        if (!mark) return null;
        return (
          <div
            data-sensitive="true"
            style={{
              marginTop: 8, paddingTop: 7,
              borderTop: `1px solid ${tk?.hairline ?? 'rgba(127,127,127,0.22)'}`,
              fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
              fontSize: 11, lineHeight: 1.5, color: tk?.inkSoft ?? '#94a3b8',
            }}
          >
            <span style={{
              fontFamily: '"IBM Plex Mono", monospace', fontSize: 9,
              letterSpacing: '0.1em', textTransform: 'uppercase',
            }}>
              Potentially sensitive · {mark.reasons.join(' · ')}
            </span>
            <div style={{ marginTop: 3 }}>{mark.note}</div>
          </div>
        );
      })()}
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
  const [openSlug, setOpenSlug] = useState(null);
  if (!receipt) return null;

  const hits = receipt.hits || [];
  const groups = groupBySlug(hits);
  const summary = groups.length > 0
    ? `Our working · ${groups.length} source${groups.length === 1 ? '' : 's'}`
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
          {groups.map((g) => (
            <div key={g.key}>
              <button
                onClick={() => setOpenSlug(openSlug === g.key ? null : g.key)}
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  display: 'flex', gap: 8, alignItems: 'baseline',
                  padding: '3px 0 3px 14px', textAlign: 'left', width: '100%',
                }}
              >
                <span style={{
                  fontFamily: '"IBM Plex Mono", monospace', fontSize: 10,
                  color: tk?.teal ?? '#0f766e', flexShrink: 0,
                }}>{g.hits.map((h) => `[${h.n}]`).join('')}</span>
                <span style={{
                  fontFamily: '"IBM Plex Sans", system-ui, sans-serif', fontSize: 11.5,
                  color: tk?.inkMid ?? '#64748b',
                }}>
                  {publisherOf(g.hits[0]) ?? g.slug}
                  {g.layer ? (
                    <span style={{ color: tk?.inkSoft ?? '#94a3b8' }}> · {g.layer}</span>
                  ) : null}
                  {g.hits.length > 1 ? (
                    <span style={{ color: tk?.inkSoft ?? '#94a3b8' }}> · {g.hits.length} excerpts</span>
                  ) : null}
                </span>
              </button>
              {openSlug === g.key && g.hits.map((hit) => (
                <CitationCard key={hit.n ?? hit.evidence_id} hit={hit} tk={tk} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
