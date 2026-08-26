// The record, with room to be read.
//
// John, 2026-08-26: "I can collapse that — but what we need is a pop out to a new
// page with all of that, not just sitting in the bubble."
//
// The companion panel had outgrown itself. It started as a chip that counted
// things; by this afternoon it carried the claims, the pathway and the shortlist,
// floating over Leonardo's answer and clipping his best paragraph mid-sentence.
// It was also telling three stories about one record on a single screen: header
// "12 noted" (claims + shortlist + proposals), body "6 things we've noted so far"
// (claims alone), left rail "0/6" (a legacy tile count wired to nothing at all).
//
// So the record gets somewhere to live. Everything, at full width, on a surface
// that isn't competing with the conversation for the same pixels. The panel goes
// back to being a glance with a door in it.
//
// It opens cold, by design: no props, no chat state, no parent. A link, a
// refresh, a phone — it recovers the session itself and re-reads the record from
// the API.
//
// The primary door is now the `kept` PROJECTION, which opens over the
// conversation and loses nothing. This route stays for the cold cases (a shared
// link, a second device) and renders the SAME component, so there is one design
// rather than a black outlier hiding behind a URL (John, 2026-08-26: "opens up
// this page in the screen that is black").
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { storedSessionId } from '../api/spine.js';
import { KeptProjection } from '../components/chat/Projections.jsx';

const MONO = '"IBM Plex Mono", monospace';
const SANS = '"IBM Plex Sans", system-ui, sans-serif';

function Section({ title, children }) {
  return (
    <section style={{ marginBottom: 34 }}>
      <h2 style={{
        fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
        color: '#5eead4', margin: '0 0 12px', fontWeight: 500,
      }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

// A kept move, in the founder's terms: what it is, why it was kept, and the one
// real action attached to it. Never a dead control — a route with no
// external_action renders no button at all.
function Move({ move }) {
  const title = move.label || move.item?.title || move.route || 'Pathway';
  const moment = typeof move.reason === 'string' ? move.reason : move.reason?.moment;
  return (
    <div style={{ padding: '10px 0', borderBottom: '1px solid rgba(148,163,184,0.15)' }}>
      <div style={{ fontFamily: SANS, fontSize: 13.5, color: '#e2e8f0' }}>{title}</div>
      {move.item?.title && move.item.title !== title && (
        <div style={{ fontFamily: SANS, fontSize: 12, color: '#94a3b8', marginTop: 3 }}>
          {move.item.title}
        </div>
      )}
      {moment && (
        <div style={{ fontFamily: SANS, fontSize: 11.5, color: '#64748b', marginTop: 4, fontStyle: 'italic' }}>
          Added {moment}
        </div>
      )}
      {move.cta?.url && (
        <a
          href={move.cta.url} target="_blank" rel="noopener noreferrer"
          style={{
            display: 'inline-block', marginTop: 7, fontFamily: MONO, fontSize: 10.5,
            color: '#5eead4', textDecoration: 'none',
            borderBottom: '1px solid rgba(94,234,212,0.4)',
          }}
        >
          {move.cta.label || 'Open'} →
        </a>
      )}
    </div>
  );
}

export function RecordPage() {
  const [record, setRecord] = useState(null);
  const [state, setState] = useState('loading'); // loading | ready | empty | error
  const sessionId = storedSessionId();

  const load = useCallback(async () => {
    if (!sessionId) { setState('empty'); return; }
    try {
      const res = await fetch(`/api/v1/session/${sessionId}/record`);
      if (!res.ok) { setState('error'); return; }
      const body = await res.json();
      setRecord(body.record ?? null);
      setState('ready');
    } catch {
      setState('error');
    }
  }, [sessionId]);

  useEffect(() => { load(); }, [load]);

  // Answering here writes the same claim_event the chat ceremony writes — one
  // verb, one log. Re-read after, so the pathway recomputes against the answer:
  // confirming a claim is what opens the next thing.
  const answerClaim = useCallback(async (claimId, action) => {
    await fetch(`/api/v1/session/${sessionId}/claims/${claimId}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    await load();
  }, [sessionId, load]);

  const acceptProposal = useCallback(async (proposalId) => {
    await fetch(`/api/v1/session/${sessionId}/proposals/${proposalId}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    await load();
  }, [sessionId, load]);

  const page = {
    minHeight: '100vh', background: '#faf8f5', color: '#1f2430',
    padding: '20px 0 60px',
  };
  const inner = { maxWidth: 900, margin: '0 auto', padding: '0 24px' };

  const backLink = (
    <Link
      to="/chat"
      style={{
        fontFamily: MONO, fontSize: 11, color: '#6b7280', textDecoration: 'none',
        borderBottom: '1px solid rgba(31,36,48,0.2)',
      }}
    >
      ← Back to the conversation
    </Link>
  );

  if (state === 'loading') {
    return (
      <div style={page}><div style={inner}>
        <div style={{ fontFamily: MONO, fontSize: 12, color: '#6b7280' }}>Reading your record…</div>
      </div></div>
    );
  }

  if (state === 'error') {
    return (
      <div style={page}><div style={inner}>
        {backLink}
        <p style={{ fontFamily: SANS, fontSize: 14, color: '#4b5563', marginTop: 22 }}>
          We couldn&apos;t load your record just now. That&apos;s on us, not you — the
          conversation is still there, and nothing has been lost.
        </p>
      </div></div>
    );
  }

  const claims = record?.claims ?? [];
  const proposals = record?.proposals ?? [];
  const shortlist = record?.shortlist ?? [];
  const isEmpty = state === 'empty' || (claims.length + proposals.length + shortlist.length === 0);

  // ABSENCE RULE: an empty record says so in one human line and points at the way
  // to fill it. It never renders a scaffold of empty sections — a form to complete
  // is exactly the feeling this product exists to avoid.
  if (isEmpty) {
    return (
      <div style={page}><div style={inner}>
        {backLink}
        <h1 style={{ fontFamily: '"Instrument Serif", Georgia, serif', fontWeight: 400, fontSize: 34, margin: '26px 0 10px' }}>
          Your record
        </h1>
        <p style={{ fontFamily: SANS, fontSize: 15, color: '#4b5563', lineHeight: 1.6, maxWidth: 560 }}>
          There&apos;s nothing kept here yet. This fills as we talk — every read, every
          answer you give, and every pathway you keep gathers here. Start a
          conversation and come back.
        </p>
      </div></div>
    );
  }

  // The same component the `kept` projection renders, so the record looks like
  // itself wherever it is opened.
  return (
    <div style={page}>
      <div style={inner}>{backLink}</div>
      <KeptProjection
        record={record}
        onAccept={acceptProposal}
        onAnswerClaim={answerClaim}
        t={{ theme: 'pearl' }}
      />
    </div>
  );
}

export default RecordPage;
