// "Before we read your site" — the moment the machine shows it arrived already
// knowing, and can prove where each thing came from.
//
// This is the strongest true thing the product does and it was invisible: it
// landed as a clause mid-paragraph ("our research suggests across 19 countries")
// that a viewer walks past. Nothing on cognisys.co.uk says 19 countries. The
// corpus held it, from a Yahoo Finance piece, six days before anyone typed the
// domain. That is the whole argument for CORPUS in one beat, and it needs to be
// its own object on the page rather than a subordinate clause.
//
// Every element is derived, never decorative: the publisher, the date it was
// gathered, and the words themselves. If nothing qualifies it renders nothing —
// no hedge, no empty state (the ABSENCE RULE). A beat that fires when it has
// nothing to show is worse than no beat, because it teaches the viewer that the
// interesting one might also be furniture.
import { priorHoldings } from '../../rendering/priorKnowledge.js';
import { tidyExcerpt } from '../../rendering/tidyExcerpt.js';

const MONO = '"IBM Plex Mono", monospace';
const SANS = '"IBM Plex Sans", system-ui, sans-serif';
const SERIF = '"Instrument Serif", Georgia, serif';

function gatheredOn(ms) {
  return new Date(ms).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

export function PriorKnowledge({ hits, sessionStartedAt, companyName, tk }) {
  const held = priorHoldings(hits, sessionStartedAt);
  if (held.length === 0) return null;

  const soft = tk?.inkSoft ?? '#64748b';
  const ink = tk?.ink ?? '#1f2430';
  const rule = tk?.hairline ?? 'rgba(127,127,127,0.22)';
  const accent = tk?.teal ?? '#0f766e';
  const name = companyName || 'this company';
  const n = held.length;

  return (
    <div style={{
      margin: '14px 0 18px 44px', maxWidth: 620,
      border: `1px solid ${rule}`, borderRadius: 10, overflow: 'hidden',
    }}>
      <div style={{
        padding: '10px 14px', borderBottom: `1px solid ${rule}`,
        fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.14em',
        textTransform: 'uppercase', color: accent,
      }}>
        Before we read your site
      </div>

      <div style={{ padding: '12px 14px 4px' }}>
        <p style={{ fontFamily: SANS, fontSize: 13, lineHeight: 1.6, color: ink, marginBottom: 12 }}>
          The record already held {n === 1 ? 'one thing' : `${n} things`} about {name},
          gathered before this conversation started.
        </p>

        {held.map((h) => (
          <div key={h.publisher} style={{ marginBottom: 12 }}>
            <div style={{
              fontFamily: MONO, fontSize: 10, color: soft,
              letterSpacing: '0.05em', marginBottom: 4,
            }}>
              {h.publisher} · gathered {gatheredOn(h.fetchedMs)}
            </div>
            {h.excerpt && (
              <div style={{
                fontFamily: SERIF, fontStyle: 'italic', fontSize: 13.5,
                lineHeight: 1.55, color: ink,
                borderLeft: `2px solid ${accent}`, paddingLeft: 10, marginBottom: 4,
              }}>
                “{tidyExcerpt(h.excerpt)}”
              </div>
            )}
            <a
              href={h.source_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontFamily: MONO, fontSize: 10.5, color: accent,
                textDecoration: 'none', borderBottom: `1px solid ${accent}66`,
                paddingLeft: 12,
              }}
            >
              Read the original →
            </a>
          </div>
        ))}
      </div>

      <div style={{
        padding: '10px 14px', borderTop: `1px solid ${rule}`,
        fontFamily: SANS, fontSize: 12.5, lineHeight: 1.5, color: soft,
      }}>
        None of this came from your website. You hadn’t told us anything yet.
      </div>
    </div>
  );
}

export default PriorKnowledge;
