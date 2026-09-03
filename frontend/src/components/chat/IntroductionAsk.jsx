import { FONT } from '../../tokens.js';

// The founder's end of an introduction (CONSENT-BOTH-ENDS-001). A partner asked to be
// introduced on one of the founder's pathways; nothing is revealed until the founder
// says so, here. Renders from the server-folded `cer.introduction` — never stored copy.
// The partner sees the same state from their side (PortalRecordDetail); either end can
// withdraw; the log keeps every ask.

const PARTNER_NAME = {
  ingram_micro: 'Ingram Micro',
  austbrokers_cyberpro: 'CyberPro',
  vanta: 'Vanta',
};

const partnerName = (key) => PARTNER_NAME[key] || 'A partner';

export function IntroductionAsk({ introduction, onAction, tk, busy = false }) {
  const intro = introduction || { state: 'none' };
  if (intro.state === 'none') return null;
  const who = partnerName(intro.partner);
  const btn = (label, action, primary) => (
    <button
      type="button"
      disabled={busy}
      onClick={() => onAction?.(action)}
      style={{
        fontFamily: FONT.sans, fontSize: 12, fontWeight: primary ? 600 : 400, cursor: busy ? 'wait' : 'pointer',
        color: primary ? '#fff' : tk.inkSoft, background: primary ? tk.plum : 'transparent',
        border: primary ? 'none' : `1px solid ${tk.hairline}`, borderRadius: 999, padding: '5px 12px',
      }}
    >{label}</button>
  );

  let line, actions = null;
  if (intro.state === 'asked') {
    line = `${who} asked for an introduction. They see nothing until you answer.`;
    actions = <>{btn('Introduce me', 'grant', true)}{btn('Not now', 'decline')}</>;
  } else if (intro.state === 'granted') {
    line = `Introduced — ${who} can reach you. You can withdraw at any time.`;
    actions = btn('Withdraw the introduction', 'withdraw');
  } else if (intro.state === 'declined') {
    line = `You declined ${who}'s introduction. They can ask again; you decide again.`;
  } else if (intro.state === 'withdrawn') {
    line = intro.withdrawn_by === 'partner'
      ? `${who} withdrew their ask.`
      : `You withdrew the introduction. ${who} no longer sees your contact.`;
  } else {
    return null;
  }

  return (
    <div
      data-introduction-state={intro.state}
      style={{ border: `1px dashed ${tk.plum}`, borderRadius: 10, background: tk.surface, padding: '10px 12px', marginTop: 6 }}
    >
      <div style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: tk.plum, marginBottom: 4 }}>
        introduction · you decide
      </div>
      <div style={{ fontFamily: FONT.sans, fontSize: 12, color: tk.inkMid, lineHeight: 1.45 }}>{line}</div>
      {actions && <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>{actions}</div>}
    </div>
  );
}
