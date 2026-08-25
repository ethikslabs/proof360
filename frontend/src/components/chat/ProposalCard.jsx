// ProposalCard — pending proposals rendered in-stream (docs/plans/2026-08-25-
// persona-chips-and-proposal-cards.md, Task 3). Derived, never invented: every
// field comes off the live GET /proposals object (api/src/services/trigger-
// evaluator.js evaluateRegister) — id, kind, title, description, url, cer_route,
// trigger, claims_cited, gaps_cited, reason (already the human-readable "reason
// on the face" string, built server-side by proposalReason()).
//
// Lamp register (canon 2026-08-25): this card lights ground, never pushes. No
// imperative "you should" — a quiet lead-in, the reason stated plainly, and
// exactly one verb: "Add to shortlist". "Buy"/"Subscribe" must never appear
// (ANTI-SELL). "Not now" is a same-session, local-only dismissal — no defer
// endpoint exists on the API (checked: shortlist.js only tracks
// `declined_proposals` as a read-side filter with no writer route).
import { PERSONA_COLORS, PERSONA_NAMES, PERSONA_LENSES } from './PersonaFollowUps.jsx';

// Domain/trigger → persona (brief 2026-08-25): security/compliance/technical →
// edison; narrative/story/trust → sofia; deal/market/funding → leonardo;
// default edison. The proposal object carries no explicit category, so the
// read is over its own trigger/title/description/gaps text — the same surface
// a founder reads on the card face.
const SOFIA_WORDS = ['narrative', 'story', 'trust', 'brand', 'testimonial', 'reputation'];
const LEONARDO_WORDS = [
  'fund', 'funding', 'invest', 'market', 'deal', 'credit', 'accelerat',
  'raise', 'raised', 'grant', 'nonprofit', 'channel', 'partner program',
];
const EDISON_WORDS = [
  'security', 'compliance', 'technical', 'soc2', 'audit', 'privacy', 'identity',
  'network', 'backup', 'incident', 'governance', 'risk', 'insurance', 'endpoint',
  'firewall', 'mfa', 'sso', 'penetration', 'resilience', 'threat', 'encryption',
];

export function proposalPersona(proposal) {
  const blob = [
    proposal?.title,
    proposal?.description,
    proposal?.trigger,
    ...(proposal?.gaps_cited || []),
  ].filter(Boolean).join(' ').toLowerCase();

  if (SOFIA_WORDS.some((w) => blob.includes(w))) return 'sofia';
  if (LEONARDO_WORDS.some((w) => blob.includes(w))) return 'leonardo';
  if (EDISON_WORDS.some((w) => blob.includes(w))) return 'edison';
  return 'edison';
}

export function ProposalCard({ proposal, onAccept, onDefer, busy, tk }) {
  if (!proposal) return null;

  const persona = proposalPersona(proposal);
  const color = PERSONA_COLORS[persona] ?? tk.inkSoft;
  const name = PERSONA_NAMES[persona] ?? persona;
  const lens = PERSONA_LENSES[persona] ?? '';

  return (
    <div
      style={{
        border: `1px solid ${tk.hairline}`,
        borderRadius: 10,
        padding: '12px 14px',
        margin: '8px 0',
        background: tk.surface ?? tk.bg,
        fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
      }}
    >
      <div style={{ fontSize: 11, color: tk.inkSoft, marginBottom: 6 }}>
        This just became visible:
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0, display: 'inline-block' }} />
        <span style={{ fontWeight: 600, fontSize: 12, color }}>{name}</span>
        <span style={{ fontSize: 12, color: tk.inkSoft }}>· {lens}</span>
      </div>

      <div style={{ fontWeight: 600, fontSize: 14, color: tk.ink, marginBottom: 4 }}>
        {proposal.title}
      </div>
      <div style={{ fontSize: 13, color: tk.inkMid ?? tk.inkSoft, lineHeight: 1.5, marginBottom: 12 }}>
        {proposal.reason}
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <button
          type="button"
          onClick={() => onAccept(proposal.id)}
          disabled={!!busy}
          style={{
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: 11,
            letterSpacing: '0.04em',
            color: color,
            background: 'transparent',
            border: `1px solid ${color}66`,
            borderRadius: 6,
            padding: '6px 12px',
            cursor: busy ? 'default' : 'pointer',
            opacity: busy ? 0.55 : 1,
          }}
        >
          {busy ? 'Adding…' : 'Add to shortlist'}
        </button>
        <button
          type="button"
          onClick={() => onDefer(proposal.id)}
          disabled={!!busy}
          style={{
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: 11,
            letterSpacing: '0.04em',
            color: tk.inkSoft,
            background: 'transparent',
            border: 'none',
            padding: '6px 4px',
            cursor: busy ? 'default' : 'pointer',
          }}
        >
          Not now
        </button>
      </div>
    </div>
  );
}
