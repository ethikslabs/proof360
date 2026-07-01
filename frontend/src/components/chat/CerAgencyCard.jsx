import { useState } from 'react';
import { FONT } from '../../tokens.js';
import { CerBadge } from './cerStatus.jsx';

// FRAME 3 — the inline agency card. Surfaces IN the chat stream (not a route change)
// when the CER is complete: the proposed record, the evidence it will carry, WHO sees
// it / who never does, a consent checkbox, and Confirm. This is "no silent form POST"
// made literal — nothing is created until the founder confirms here.
//
// proposal: { pathwayLabel, route, need, evidence: string[], visibility: [{ who, verdict, tone }] }
//   tone ∈ 'full' | 'later' | 'never'  (drives the value colour)

function KV({ k, v, mono, tk }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '7px 0', borderBottom: `1px dotted ${tk.hairline}` }}>
      <span style={{ fontFamily: FONT.sans, fontSize: 12, color: tk.inkSoft }}>{k}</span>
      <span style={{ fontFamily: mono ? FONT.mono : FONT.sans, fontSize: mono ? 11 : 12, color: tk.inkMid, textAlign: 'right' }}>{v}</span>
    </div>
  );
}

export function CerAgencyCard({ proposal, tk, onConfirm, onEdit, busy }) {
  const [consented, setConsented] = useState(false);
  const toneColor = { full: tk.sevOk, later: tk.inkSoft, never: tk.sevHigh };

  return (
    <div style={{ border: `1.5px solid ${tk.plum}`, borderRadius: 14, background: tk.surface, padding: 16, maxWidth: 460 }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontFamily: FONT.mono, fontSize: 10, letterSpacing: '0.08em', color: tk.plum, textTransform: 'uppercase' }}>
          Proposed CER · commercial_engagement
        </span>
        <CerBadge status="not created yet" label="not created yet" tk={tk} />
      </div>

      {/* record summary */}
      <KV k="Pathway" v={proposal.pathwayLabel} tk={tk} />
      <KV k="Route" v={proposal.route} mono tk={tk} />
      <KV k="Need / gap" v={proposal.need} tk={tk} />

      {/* evidence */}
      <div style={{ marginTop: 12 }}>
        <div style={{ fontFamily: FONT.sans, fontSize: 12, color: tk.inkSoft, marginBottom: 6 }}>Evidence it will carry</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {proposal.evidence.map((chip) => (
            <span key={chip} style={{ fontFamily: FONT.mono, fontSize: 10, color: tk.inkMid, background: tk.bgTint, border: `1px solid ${tk.hairline}`, borderRadius: 6, padding: '3px 7px' }}>{chip}</span>
          ))}
        </div>
        <div style={{ fontFamily: FONT.mono, fontSize: 10, color: tk.inkSoft, marginTop: 6 }}>referenced only — no unrelated private evidence</div>
      </div>

      {/* visibility */}
      <div style={{ marginTop: 12, background: tk.bgTint, border: `1px solid ${tk.hairline}`, borderRadius: 10, padding: 12 }}>
        <div style={{ fontFamily: FONT.sans, fontSize: 12, color: tk.inkSoft, marginBottom: 6 }}>Visibility — who sees this</div>
        {proposal.visibility.map((row) => (
          <div key={row.who} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '5px 0' }}>
            <span style={{ fontFamily: FONT.sans, fontSize: 12, color: tk.inkMid }}>{row.who}</span>
            <span style={{ fontFamily: FONT.mono, fontSize: 11, color: toneColor[row.tone] || tk.inkSoft }}>{row.verdict}</span>
          </div>
        ))}
      </div>

      {/* consent */}
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 14, cursor: 'pointer' }}>
        <input type="checkbox" checked={consented} onChange={(e) => setConsented(e.target.checked)} style={{ marginTop: 2, accentColor: tk.plum }} />
        <span style={{ fontFamily: FONT.sans, fontSize: 13, color: tk.ink }}>
          I consent to share the above with this pathway.{' '}
          <span style={{ color: tk.inkSoft }}>Scoped to this record · withdraw anytime.</span>
        </span>
      </label>

      {/* actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button
          type="button"
          onClick={onEdit}
          style={{ fontFamily: FONT.sans, fontSize: 13, fontWeight: 600, color: tk.inkSoft, background: 'transparent', border: `1px solid ${tk.hairline}`, borderRadius: 9, padding: '9px 15px', cursor: 'pointer' }}
        >
          Edit
        </button>
        <button
          type="submit"
          disabled={!consented || busy}
          onClick={() => consented && onConfirm?.()}
          style={{
            flex: 1, fontFamily: FONT.sans, fontSize: 13, fontWeight: 600,
            color: '#fff', background: consented && !busy ? tk.ink : tk.inkGhost,
            border: 'none', borderRadius: 9, padding: '9px 15px',
            cursor: consented && !busy ? 'pointer' : 'default', transition: 'background 0.15s',
          }}
        >
          {busy ? 'Creating…' : 'Confirm & create pathway'}
        </button>
      </div>
    </div>
  );
}
