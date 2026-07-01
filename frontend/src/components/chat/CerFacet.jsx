import { FONT } from '../../tokens.js';
import { CerBadge } from './cerStatus.jsx';

// FRAME 5 — a created CER as a sidebar facet, sitting beside Company Profile with the
// same "fills as you go" language. Purple-accented to distinguish a Decision from the
// profile tile. Presentational: renders a cer projection object.

const ROUTE_SQ = {
  ingram_micro_aws: 'AW',
  austbrokers_cyberpro: 'CY',
  vanta: 'CO',
  ingram_micro_cisco: 'CS',
};
const ROUTE_TITLE = {
  ingram_micro_aws: 'AWS PATHWAY',
  austbrokers_cyberpro: 'CYBER INSURANCE',
  vanta: 'COMPLIANCE',
  ingram_micro_cisco: 'CISCO PATHWAY',
};

export function CerFacet({ cer, meter = 7, total = 7, tk, onClick }) {
  const withdrawn = cer.consent_state === 'withdrawn';
  const blurb = withdrawn
    ? 'Consent withdrawn — no further partner sharing.'
    : 'Ethiks360 will review this. Book a call or withdraw consent anytime.';

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'block', width: '100%', textAlign: 'left', cursor: onClick ? 'pointer' : 'default',
        border: `1.5px solid ${tk.plum}`, borderRadius: 12, background: tk.surfaceLo, padding: 12,
        opacity: withdrawn ? 0.7 : 1,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ width: 26, height: 26, borderRadius: 7, background: tk.plum, color: '#fff', fontFamily: FONT.mono, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {ROUTE_SQ[cer.route] || 'CE'}
        </span>
        <span style={{ fontFamily: FONT.mono, fontSize: 11, color: tk.plum, letterSpacing: '0.04em' }}>{ROUTE_TITLE[cer.route] || 'PATHWAY'}</span>
        <span style={{ marginLeft: 'auto', fontFamily: FONT.mono, fontSize: 10, color: tk.inkSoft }}>{meter}/{total}</span>
      </div>
      <div style={{ marginBottom: 6 }}>
        <CerBadge status={cer.status} tk={tk} />
      </div>
      <div style={{ fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 12.5, color: tk.plum, opacity: 0.85, lineHeight: 1.4 }}>{blurb}</div>
    </button>
  );
}
