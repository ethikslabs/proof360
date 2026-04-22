import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getInferences, submitSession } from '../api/client';

/* ─── Constants ──────────────────────────────────────────────────────────── */
const NAVY  = '#0B2545';
const AMBER = '#E07B39';
const WHITE = '#FFFFFF';
const OFFWHITE = '#F7F8FA';
const BORDER = '#E4E7EC';
const TEXT   = '#101828';
const MUTED  = '#667085';

/* ─── Demo mock data ─────────────────────────────────────────────────────── */
const DEMO_DATA = {
  company_name: 'Meridian Labs',
  source_summary: 'meridian-labs.io · 5 pages · 8 signals',
  inferences: [
    { inference_id: 'inf_product_type', label: 'B2B SaaS product', confidence: 'confident', category: 'product' },
    { inference_id: 'inf_customer_type', label: 'Targeting enterprise buyers', confidence: 'confident', category: 'market' },
    { inference_id: 'inf_compliance', label: 'Pre-SOC 2', confidence: 'probable', category: 'governance' },
  ],
  correctable_fields: [
    { key: 'customer_type', label: 'Customer type', inferred_value: 'Enterprise SaaS' },
    { key: 'data_sensitivity', label: 'Data sensitivity', inferred_value: 'Business data' },
    { key: 'infrastructure', label: 'Infrastructure', inferred_value: 'AWS (probable)' },
  ],
  followup_questions: [],
};

/* ─── Derive the 3 confirmation cards ────────────────────────────────────── */
function buildCards(data) {
  const cards = [];

  // Prefer correctable_fields — these are the high-value signals
  for (const f of (data.correctable_fields || [])) {
    if (cards.length >= 3) break;
    cards.push({ key: f.key, label: f.label.toUpperCase(), value: f.inferred_value.replace(' (probable)', '') });
  }

  // Fill from inferences if needed
  if (cards.length < 3) {
    for (const inf of (data.inferences || [])) {
      if (cards.length >= 3) break;
      if (!cards.find(c => c.key === inf.inference_id)) {
        const catLabel = {
          product: 'PRODUCT TYPE', market: 'MARKET', data: 'DATA HANDLING',
          infrastructure: 'INFRASTRUCTURE', governance: 'COMPLIANCE', company: 'COMPANY',
        };
        cards.push({
          key: inf.inference_id,
          label: catLabel[inf.category] || inf.category?.toUpperCase() || 'SIGNAL',
          value: inf.label,
        });
      }
    }
  }

  return cards.slice(0, 3);
}

/* ─── Confirmation card ──────────────────────────────────────────────────── */
function ConfirmCard({ card, status, onConfirm, onNotQuite }) {
  // status: 'active' | 'confirmed' | 'corrected' | 'pending'
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(card.value);

  if (status === 'pending') return null;

  const isDone = status === 'confirmed' || status === 'corrected';

  return (
    <div style={{
      background: isDone ? 'rgba(255,255,255,0.04)' : WHITE,
      border: `1px solid ${isDone ? 'rgba(255,255,255,0.08)' : BORDER}`,
      borderRadius: 12,
      padding: '20px 24px',
      animation: 'fadeUp 0.5s ease both',
      transition: 'background 0.3s, border-color 0.3s',
    }}>
      <p style={{
        fontSize: 10, fontWeight: 600, letterSpacing: '0.1em',
        color: isDone ? 'rgba(255,255,255,0.3)' : MUTED,
        fontFamily: '"IBM Plex Mono", monospace',
        marginBottom: 8,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        {isDone && <span style={{ color: status === 'corrected' ? AMBER : '#4ADE80' }}>✓</span>}
        {card.label}
      </p>

      <p style={{
        fontSize: 20, fontWeight: 600,
        color: isDone ? 'rgba(255,255,255,0.4)' : TEXT,
        letterSpacing: '-0.02em',
        marginBottom: isDone ? 0 : 20,
        fontFamily: '"Outfit", sans-serif',
        lineHeight: 1.2,
      }}>
        {status === 'corrected' ? editValue : card.value}
      </p>

      {status === 'active' && !editing && (
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: '10px 0',
              background: '#0B2545', color: WHITE,
              border: 'none', borderRadius: 7,
              fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: '"Outfit", sans-serif',
            }}
          >
            Yes, that's right
          </button>
          <button
            onClick={() => setEditing(true)}
            style={{
              flex: 1,
              padding: '10px 0',
              background: 'none', color: MUTED,
              border: `1px solid ${BORDER}`, borderRadius: 7,
              fontSize: 13, fontWeight: 500,
              cursor: 'pointer', fontFamily: '"Outfit", sans-serif',
            }}
          >
            Not quite
          </button>
        </div>
      )}

      {status === 'active' && editing && (
        <div>
          <input
            autoFocus
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            style={{
              width: '100%', padding: '10px 14px',
              fontSize: 14, color: TEXT,
              border: `1px solid ${NAVY}`,
              borderRadius: 7, outline: 'none',
              fontFamily: '"Outfit", sans-serif',
              marginBottom: 10, boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => onNotQuite(editValue)}
              style={{
                flex: 1, padding: '10px 0',
                background: AMBER, color: WHITE,
                border: 'none', borderRadius: 7,
                fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: '"Outfit", sans-serif',
              }}
            >
              Save correction
            </button>
            <button
              onClick={() => { setEditing(false); setEditValue(card.value); }}
              style={{
                padding: '10px 16px',
                background: 'none', color: MUTED,
                border: `1px solid ${BORDER}`, borderRadius: 7,
                fontSize: 13, cursor: 'pointer',
                fontFamily: '"Outfit", sans-serif',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────── */
export default function AuditColdRead() {
  const [params]   = useSearchParams();
  const sessionId  = params.get('session');
  const isDemo     = params.get('demo') === 'true';
  const navigate   = useNavigate();

  const [data,       setData]       = useState(null);
  const [error,      setError]      = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 333 state
  const [activeCard,  setActiveCard]  = useState(0);
  const [statuses,    setStatuses]    = useState({}); // key → 'confirmed' | 'corrected' | 'pending'
  const [corrections, setCorrections] = useState({}); // key → corrected string
  const [allDone,     setAllDone]     = useState(false);

  useEffect(() => {
    const link = document.createElement('link');
    link.rel   = 'stylesheet';
    link.href  = 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap';
    document.head.appendChild(link);
    return () => link.remove();
  }, []);

  useEffect(() => {
    if (isDemo) { setData(DEMO_DATA); return; }
    if (!sessionId) return;
    getInferences(sessionId)
      .then(setData)
      .catch(() => setError("We couldn't load your results. Please try again."));
  }, [sessionId, isDemo]);

  const cards = data ? buildCards(data) : [];

  function advance(key, status, correctionValue) {
    setStatuses(s => ({ ...s, [key]: status }));
    if (correctionValue !== undefined) {
      setCorrections(c => ({ ...c, [key]: correctionValue }));
    }
    const nextIdx = activeCard + 1;
    if (nextIdx >= cards.length) {
      setTimeout(() => setAllDone(true), 300);
    } else {
      setTimeout(() => setActiveCard(nextIdx), 400);
    }
  }

  function handleConfirm(key) {
    advance(key, 'confirmed', undefined);
  }

  function handleNotQuite(key, value) {
    advance(key, 'corrected', value);
  }

  async function handleSubmit() {
    if (isDemo) { navigate('/report/demo'); return; }
    setSubmitting(true);
    try {
      await submitSession(sessionId, { corrections, followup_answers: {} });
      navigate(`/processing?session=${sessionId}`);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  if (error && !data) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"Outfit", sans-serif', background: '#FFFFFF' }}>
      <p style={{ color: MUTED }}>{error}</p>
    </div>
  );

  if (!data) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFFFF' }}>
      <div style={{ width: 20, height: 20, border: `2px solid #1A1A2E`, borderTopColor: AMBER, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ background: '#FFFFFF', minHeight: '100vh', fontFamily: '"Outfit", sans-serif' }}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Nav */}
      <nav style={{
        padding: '0 32px', height: 52,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid #E4E7EC',
      }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: NAVY, letterSpacing: '-0.01em' }}>
          Proof<span style={{ color: AMBER }}>360</span>
        </span>
        <span style={{ fontSize: 11, color: MUTED, fontFamily: '"IBM Plex Mono", monospace' }}>
          Step 2 of 3
        </span>
      </nav>

      {/* Content */}
      <div style={{
        maxWidth: 520, margin: '0 auto',
        padding: '56px 24px 80px',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <p style={{
            fontSize: 11, color: '#52525B',
            fontFamily: '"IBM Plex Mono", monospace',
            marginBottom: 12, letterSpacing: '0.05em',
          }}>
            {data.company_name} · {data.source_summary}
          </p>
          <h1 style={{
            fontSize: 32, fontWeight: 700, color: NAVY,
            letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 8,
          }}>
            Is this right?
          </h1>
          <p style={{ fontSize: 14, color: '#52525B', lineHeight: 1.6 }}>
            We read your public signals. Confirm what we got — or correct it.
          </p>
        </div>

        {/* Cards */}
        {cards.map((card, i) => {
          const status = i < activeCard
            ? (statuses[card.key] || 'confirmed')
            : i === activeCard
            ? (statuses[card.key] || 'active')
            : 'pending';

          return (
            <ConfirmCard
              key={card.key}
              card={card}
              status={status}
              onConfirm={() => handleConfirm(card.key)}
              onNotQuite={(val) => handleNotQuite(card.key, val)}
            />
          );
        })}

        {/* Done state */}
        {allDone && (
          <div style={{
            marginTop: 20,
            animation: 'fadeUp 0.6s ease both',
            textAlign: 'center',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
          }}>
            <p style={{ fontSize: 16, color: '#F7F4F0', fontWeight: 500, lineHeight: 1.5 }}>
              We've got what we need.
            </p>
            <p style={{ fontSize: 13, color: '#52525B' }}>
              Building your trust read now.
            </p>
            {error && <p style={{ fontSize: 13, color: '#F87171' }}>{error}</p>}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                padding: '13px 40px',
                background: submitting ? MUTED : AMBER,
                color: WHITE,
                fontSize: 15, fontWeight: 700,
                border: 'none', borderRadius: 8,
                cursor: submitting ? 'not-allowed' : 'pointer',
                fontFamily: '"Outfit", sans-serif',
                letterSpacing: '-0.01em',
                transition: 'background 0.15s',
              }}
            >
              {submitting ? 'Generating...' : 'Build my report →'}
            </button>
          </div>
        )}

        {/* Skip straight to report (available after first card) */}
        {!allDone && activeCard > 0 && (
          <button
            onClick={handleSubmit}
            style={{
              marginTop: 8,
              background: 'none', border: 'none',
              fontSize: 12, color: '#3F3F5A',
              cursor: 'pointer', textDecoration: 'underline',
              fontFamily: '"Outfit", sans-serif',
              textAlign: 'center',
            }}
          >
            Skip — show my report anyway
          </button>
        )}
      </div>
    </div>
  );
}
