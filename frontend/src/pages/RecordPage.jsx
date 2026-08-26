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
// refresh, a second tab, a phone — it recovers the session itself and re-reads
// the record from the API. Dark, because the record is its own place; the
// conversation is the lit room and this is the ledger you step out to.
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { storedSessionId } from '../api/spine.js';
import { ClaimStrip } from '../components/chat/ClaimStrip.jsx';
import { PathwaySuggestions } from '../components/chat/PathwaySuggestions.jsx';

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
    minHeight: '100vh', background: '#0b1120', color: '#e2e8f0',
    padding: '38px 24px 80px',
  };
  const inner = { maxWidth: 760, margin: '0 auto' };

  const backLink = (
    <Link
      to="/chat"
      style={{
        fontFamily: MONO, fontSize: 11, color: '#94a3b8', textDecoration: 'none',
        borderBottom: '1px solid rgba(148,163,184,0.3)',
      }}
    >
      ← Back to the conversation
    </Link>
  );

  if (state === 'loading') {
    return (
      <div style={page}><div style={inner}>
        <div style={{ fontFamily: MONO, fontSize: 12, color: '#64748b' }}>Reading your record…</div>
      </div></div>
    );
  }

  if (state === 'error') {
    return (
      <div style={page}><div style={inner}>
        {backLink}
        <p style={{ fontFamily: SANS, fontSize: 14, color: '#94a3b8', marginTop: 22 }}>
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
        <h1 style={{ fontFamily: SANS, fontSize: 22, fontWeight: 400, margin: '26px 0 10px' }}>
          Your record
        </h1>
        <p style={{ fontFamily: SANS, fontSize: 14, color: '#94a3b8', lineHeight: 1.6 }}>
          There&apos;s nothing here yet. This fills as we talk — every read, every
          answer you give, and every pathway you keep lands on this page. Start a
          conversation and come back.
        </p>
      </div></div>
    );
  }

  const settled = record?.confirmed_count ?? 0;
  const total = record?.total_count ?? claims.length;

  return (
    <div style={page}>
      <div style={inner}>
        {backLink}

        <header style={{ margin: '26px 0 30px' }}>
          <h1 style={{ fontFamily: SANS, fontSize: 24, fontWeight: 400, margin: 0 }}>
            {record?.company_name || 'Your record'}
          </h1>
          {/* What YOU have settled, out of what we have noted. Not a mark out of
              anything — the company is never graded (John's ruling, 2026-08-26). */}
          <div style={{ fontFamily: MONO, fontSize: 11, color: '#64748b', marginTop: 7 }}>
            {settled} of {total} settled in your own words
            {record?.website_url ? ` · ${record.website_url.replace(/^https?:\/\//, '')}` : ''}
          </div>
        </header>

        {claims.length > 0 && (
          <Section title="What we've noted">
            <ClaimStrip claims={claims} onAnswer={answerClaim} />
          </Section>
        )}

        {proposals.length > 0 && (
          <Section title="Open to you now">
            <PathwaySuggestions proposals={proposals} onAccept={acceptProposal} />
          </Section>
        )}

        {shortlist.length > 0 && (
          <Section title="What you've kept">
            {shortlist.map((m) => <Move key={m.cer_id} move={m} />)}
          </Section>
        )}
      </div>
    </div>
  );
}

export default RecordPage;
