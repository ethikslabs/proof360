import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { TENANTS } from '../data/portal-leads';

// One engagement record, partner view. Everything rendered is server state from
// GET /api/v1/partner/:partner/cers/:cerId — a record not routed to this partner 404s
// identically to one that does not exist. Actions here are partner-side intent
// (localStorage, same pattern as the lead flow); they never mutate the founder's record —
// the CER is the customer's, and only the customer's own surface appends to it.

const TENANT_CER_PARTNER = { ingram: 'ingram_micro', vanta: 'vanta', austbrokers: 'austbrokers_cyberpro' };

const GAP_LABEL = {
  aws_program_eligibility: 'AWS program eligibility',
  soc2: 'SOC 2 readiness',
  mfa: 'MFA not enforced',
  cyber_insurance: 'No cyber insurance',
  backup_dr: 'Backup / DR',
  edr: 'Endpoint protection',
};

const EVENT_LABEL = {
  'consent-granted': 'Customer granted consent to share this engagement',
  'consent-withdrawn': 'Customer withdrew consent',
  'status-updated': 'Status updated',
  'introduction-requested': 'You asked for an introduction',
  'introduction-granted': 'The founder introduced you',
  'introduction-declined': 'The founder declined the introduction',
  'introduction-withdrawn': 'Introduction withdrawn',
};

const mono = "'IBM Plex Mono', monospace";

function Field({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <div style={{ fontSize: 9, color: '#9ca3af', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13, color: '#111827', fontFamily: mono }}>{value}</div>
    </div>
  );
}

export default function PortalRecordDetail() {
  const { cerId } = useParams();
  const navigate = useNavigate();
  // Read once at first render — no effect, so no cascading setState.
  const [auth] = useState(() => {
    const stored = localStorage.getItem('portal_auth');
    return stored ? JSON.parse(stored) : null;
  });
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [askError, setAskError] = useState(null);
  const [fetchFailed, setFetchFailed] = useState(false);

  const partner = auth ? TENANT_CER_PARTNER[auth.tenant] : null;
  // Derived, not stateful: an unsupported tenant is a fact about auth, not an event.
  const notFound = fetchFailed || (auth && !partner);

  useEffect(() => {
    if (!auth) navigate('/portal');
  }, [auth, navigate]);

  useEffect(() => {
    if (!partner) return;
    let alive = true;
    fetch(`/api/v1/partner/${partner}/cers/${cerId}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (!alive) return; d ? setData(d) : setFetchFailed(true); })
      .catch(() => { if (alive) setFetchFailed(true); });
    return () => { alive = false; };
  }, [partner, cerId]);

  // The partner's end of the edge (CONSENT-BOTH-ENDS-001): ask, or withdraw the ask. The
  // founder answers in their own Strategy Room; the contact appears here only when they do.
  // Nothing is revealed by a click on this side — there is no "reveal" action to call.
  async function introduction(action) {
    setBusy(true); setAskError(null);
    try {
      const res = await fetch(`/api/v1/partner/${partner}/cers/${cerId}/introduction`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }),
      });
      if (!res.ok) { setAskError(res.status === 409 ? 'This record is not in a state that allows that.' : 'The ask did not go through.'); return; }
      const fresh = await fetch(`/api/v1/partner/${partner}/cers/${cerId}`);
      if (fresh.ok) setData(await fresh.json());
    } catch {
      setAskError('The ask did not go through.');
    } finally {
      setBusy(false);
    }
  }

  if (!auth) return null;
  const tenant = TENANTS[auth.tenant];
  const tc = tenant?.color || '#2563eb';

  if (notFound) {
    return (
      <div style={{ minHeight: '100vh', background: '#f3f4f6', fontFamily: 'var(--p360-sans)', padding: '80px 28px', textAlign: 'center' }}>
        <div style={{ fontSize: 10, color: '#9ca3af', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10, fontFamily: mono }}>
          Record not available
        </div>
        <p style={{ fontSize: 13, color: '#6b7280', maxWidth: 380, margin: '0 auto 20px' }}>
          This record is not shared with your organisation, or no longer carries consent.
        </p>
        <Link to="/portal/dashboard" style={{ fontSize: 13, color: tc }}>← Back to your window</Link>
      </div>
    );
  }

  if (!data) return null;
  const r = data.record;
  const opp = r.opportunity;

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', fontFamily: 'var(--p360-sans)' }}>
      <style>{`
        @keyframes rowIn { from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none} }
        *{box-sizing:border-box;margin:0;padding:0}
      `}</style>

      <div style={{ background: '#0A1628', padding: '13px 28px' }}>
        <Link to="/portal/dashboard" style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>
          ← {tenant?.name} · your window
        </Link>
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '28px' }}>
        {/* Customer + record header */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111827', letterSpacing: '-0.02em' }}>{r.customer?.name || r.route}</h1>
            {r.customer?.country && <span style={{ fontSize: 12, color: '#6b7280', fontFamily: mono }}>{r.customer.country}</span>}
            {r.customer?.domain && (
              <a href={`https://${r.customer.domain}`} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: tc, fontFamily: mono }}>
                {r.customer.domain}
              </a>
            )}
          </div>
          <div style={{ fontSize: 15, color: '#374151' }}>
            {r.label}
            {r.gap && <> · <span style={{ fontWeight: 600 }}>closes: {GAP_LABEL[r.gap] || r.gap}</span></>}
          </div>
        </div>

        {/* Introduction — the one edge this window can ask for */}
        {(() => {
          const intro = r.introduction || { state: 'none' };
          const box = { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '16px 18px', marginBottom: 18 };
          const primary = { background: tc, color: '#fff', border: 'none', borderRadius: 7, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: busy ? 'wait' : 'pointer', fontFamily: 'inherit' };
          const quiet = { background: 'transparent', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: 7, padding: '8px 14px', fontSize: 12, cursor: busy ? 'wait' : 'pointer', fontFamily: 'inherit' };
          const when = (ts) => (ts ? new Date(ts).toLocaleDateString() : '');
          return (
            <div style={box} data-introduction-state={intro.state}>
              {intro.state === 'granted' && intro.contact ? (
                <>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
                    Introduced by the founder{intro.decided_at ? ` · ${when(intro.decided_at)}` : ''}.
                  </span>
                  <span style={{ fontSize: 13, color: '#111827', fontFamily: mono }}>
                    {intro.contact.name || 'Founder'}{intro.contact.email ? <> · <a href={`mailto:${intro.contact.email}`} style={{ color: tc }}>{intro.contact.email}</a></> : null}
                  </span>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>The record travels with the intro — no re-explaining.</span>
                  <button disabled={busy} onClick={() => introduction('withdraw')} style={{ ...quiet, marginLeft: 'auto' }}>Withdraw</button>
                </>
              ) : intro.state === 'asked' ? (
                <>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>Introduction requested{intro.asked_at ? ` · ${when(intro.asked_at)}` : ''}.</span>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>The founder decides, in their own room. You will see it here when they do.</span>
                  <button disabled={busy} onClick={() => introduction('withdraw')} style={{ ...quiet, marginLeft: 'auto' }}>Withdraw the ask</button>
                </>
              ) : (
                <>
                  <button disabled={busy} onClick={() => introduction('request')} style={primary}>
                    {intro.state === 'declined' ? 'Ask again' : 'Ask for an introduction'}
                  </button>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>
                    {intro.state === 'declined'
                      ? 'The founder declined. They can be asked again; they decide again.'
                      : intro.state === 'withdrawn'
                        ? 'The introduction was withdrawn. You can ask again.'
                        : 'Goes to the founder. Their contact appears here only if they say yes.'}
                  </span>
                </>
              )}
              {askError && <span style={{ fontSize: 12, color: '#b91c1c', width: '100%' }}>{askError}</span>}
            </div>
          );
        })()}

        {/* Vendor-side transaction */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '18px', marginBottom: 18 }}>
          <div style={{ fontSize: 10, color: '#9ca3af', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14, fontFamily: mono }}>
            Transaction record
          </div>
          {opp ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 16 }}>
              <Field label="AWS opportunity" value={opp.id} />
              <Field label="Review status" value={opp.review_status} />
              <Field label="Stage" value={opp.stage} />
              <Field label="Type" value={opp.opportunity_type} />
              <Field label="Target close" value={opp.target_close_date} />
              <Field label="Expected spend" value={opp.amount != null ? `$${Number(opp.amount).toLocaleString()} ${opp.currency}/${(opp.frequency || '').toLowerCase()}` : null} />
              <Field label="Industry" value={opp.industry || r.customer?.industry} />
              <Field label="CRM reference" value={opp.partner_identifier} />
            </div>
          ) : (
            <div style={{ fontSize: 13, color: '#6b7280' }}>
              Engagement open — no vendor-side transaction on this route yet.
            </div>
          )}
        </div>

        {/* Event trail */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '18px', marginBottom: 18 }}>
          <div style={{ fontSize: 10, color: '#9ca3af', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14, fontFamily: mono }}>
            What happened on this record · {r.events.length} event{r.events.length === 1 ? '' : 's'}
          </div>
          {r.events.map((e, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, paddingBottom: 12, marginBottom: 12, borderBottom: i < r.events.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: tc, marginTop: 5, flexShrink: 0 }}/>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: '#111827' }}>
                  {EVENT_LABEL[e.type] || e.type}
                  {e.to && <> → <strong>{e.to}</strong></>}
                </div>
                <div style={{ fontSize: 11, color: '#9ca3af', fontFamily: mono, marginTop: 2 }}>
                  {e.ts ? new Date(e.ts).toLocaleString() : ''}{e.actor ? ` · ${e.actor}` : ''}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Evidence */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '18px', marginBottom: 18 }}>
          <div style={{ fontSize: 10, color: '#9ca3af', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12, fontFamily: mono }}>
            Evidence behind this record
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {r.evidence_refs.map(ref => (
              <span key={ref} style={{
                fontSize: 11, color: '#374151', fontFamily: mono,
                background: '#fafafa', border: '1px solid #e5e7eb', padding: '4px 10px', borderRadius: 5,
              }}>{ref}</span>
            ))}
          </div>
        </div>

        {/* The rest of this customer's rail, partner-scoped */}
        {data.siblings.length > 0 && (
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '18px' }}>
            <div style={{ fontSize: 10, color: '#9ca3af', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12, fontFamily: mono }}>
              Also on {r.customer?.name || 'this customer'}&apos;s record with you
            </div>
            {data.siblings.map(s => (
              <Link key={s.cer_id} to={`/portal/records/${s.cer_id}`} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
                textDecoration: 'none', color: 'inherit', borderTop: '1px solid #f3f4f6',
              }}>
                <span style={{ fontSize: 13, color: '#111827' }}>{s.label}</span>
                <span style={{ fontSize: 10, fontFamily: mono, background: `${tc}12`, border: `1px solid ${tc}30`, padding: '2px 8px', borderRadius: 5 }}>{s.status}</span>
                <span style={{ marginLeft: 'auto', fontSize: 12, color: tc }}>open →</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
