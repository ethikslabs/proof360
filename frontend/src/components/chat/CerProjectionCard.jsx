import { FONT } from '../../tokens.js';
import { CerBadge } from './cerStatus.jsx';

// FRAME 4 — the created CER as a proof360 projection. Rendered from the `cer`
// projection object (server-computed); nothing here is stored copy — status, consent,
// and the typed record all come from cerProjection(). A CER is a separate linked
// Decision: it does NOT merge into the company record.

const ROUTE_SHORT = {
  ingram_micro_aws: 'AWS',
  austbrokers_cyberpro: 'cyber insurance',
  vanta: 'compliance',
  ingram_micro_cisco: 'Cisco',
};

function KV({ k, v, mono, valueColor, tk }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '7px 0', borderBottom: `1px dotted ${tk.hairline}` }}>
      <span style={{ fontFamily: FONT.mono, fontSize: 11, color: tk.inkSoft }}>{k}</span>
      <span style={{ fontFamily: mono ? FONT.mono : FONT.sans, fontSize: 11, color: valueColor || tk.inkMid, textAlign: 'right' }}>{v}</span>
    </div>
  );
}

export function CerProjectionCard({ cer, companyName, tk, onBookCall, onWithdraw }) {
  const short = ROUTE_SHORT[cer.route] || 'pathway';
  const withdrawn = cer.consent_state === 'withdrawn';
  const evidenceCount = (cer.evidence_refs || []).length;

  const hero = withdrawn ? `Your ${short} pathway is closed.` : `Your ${short} pathway is live.`;
  const nextText = withdrawn
    ? 'Consent withdrawn. No further partner sharing will occur.'
    : cer.status === 'Booked'
      ? 'A call is booked. Ethiks360 will be in touch.'
      : 'Next: Ethiks360 reviews this pathway.';

  return (
    <div style={{ border: `1px solid ${tk.hairline}`, borderRadius: 14, background: tk.surface, padding: 18, maxWidth: 520 }}>
      {/* top row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontFamily: FONT.mono, fontSize: 10, letterSpacing: '0.08em', color: tk.umber, textTransform: 'uppercase' }}>Pathway · {short}</span>
        {companyName && (
          <span style={{ fontFamily: FONT.mono, fontSize: 10, color: tk.inkSoft, background: tk.bgTint, border: `1px solid ${tk.hairline}`, borderRadius: 4, padding: '1px 6px' }}>{companyName}</span>
        )}
        <span style={{ marginLeft: 'auto', fontFamily: FONT.mono, fontSize: 10, color: tk.inkGhost }}>{cer.cer_id.slice(0, 8)}</span>
      </div>

      {/* hero */}
      <div style={{ fontFamily: FONT.serif, fontSize: 30, color: tk.ink, lineHeight: 1.1, marginBottom: 14 }}>{hero}</div>

      {/* status block */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: tk.surfaceLo, border: `1px solid ${tk.hairline}`, borderRadius: 10, padding: 12, marginBottom: 16 }}>
        <CerBadge status={cer.status} tk={tk} />
        <span style={{ fontFamily: FONT.sans, fontSize: 12, color: tk.inkSoft }}>{nextText}</span>
        {!withdrawn && (
          <button
            type="button"
            onClick={onBookCall}
            style={{ marginLeft: 'auto', fontFamily: FONT.sans, fontSize: 12, fontWeight: 600, color: '#fff', background: tk.umber, border: 'none', borderRadius: 8, padding: '7px 12px', cursor: 'pointer' }}
          >
            Book a call
          </button>
        )}
      </div>

      {/* what got created */}
      <div style={{ fontFamily: FONT.mono, fontSize: 9.5, letterSpacing: '0.12em', color: tk.inkSoft, textTransform: 'uppercase', marginBottom: 6 }}>What got created</div>
      <div style={{ marginBottom: 14 }}>
        <KV k="Decision.type" v={cer.decision_type} mono tk={tk} />
        <KV k="pathway_type" v={cer.pathway_type} mono tk={tk} />
        <KV k="route" v={cer.route} mono tk={tk} />
        <KV k="consent_event" v={withdrawn ? 'consent-withdrawn' : 'consent-granted'} mono valueColor={withdrawn ? tk.sevHigh : tk.sevOk} tk={tk} />
        <KV k="linked" v={`person · company · ${evidenceCount} evidence ref${evidenceCount === 1 ? '' : 's'}`} tk={tk} />
      </div>

      {/* doctrine explainer + withdraw */}
      <div style={{ border: `1px dashed ${tk.hairline}`, borderRadius: 10, padding: 12, fontFamily: FONT.sans, fontSize: 12, color: tk.inkSoft, lineHeight: 1.5 }}>
        It&rsquo;s a separate linked <strong style={{ color: tk.inkMid }}>Decision</strong> — it didn&rsquo;t merge into your company record. Your dashboard shows it through a <strong style={{ color: tk.inkMid }}>projection</strong>.
      </div>

      {!withdrawn && (
        <button
          type="button"
          onClick={onWithdraw}
          style={{ marginTop: 12, fontFamily: FONT.sans, fontSize: 12, color: tk.inkSoft, background: 'transparent', border: 'none', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}
        >
          Withdraw consent
        </button>
      )}
    </div>
  );
}
