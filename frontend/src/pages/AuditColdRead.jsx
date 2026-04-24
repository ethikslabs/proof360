import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getInferences, submitSession, startSession } from '../api/client';
import { useFeatureFlags } from '../contexts/FeatureFlagContext.jsx';
import ConfidenceRibbon from '../components/report/ConfidenceRibbon.jsx';

/* ─── Constants ──────────────────────────────────────────────────────────── */
const NAVY  = '#0B2545';
const AMBER = '#E07B39';
const WHITE = '#FFFFFF';
const OFFWHITE = '#F7F8FA';
const BORDER = '#E4E7EC';
const TEXT   = '#101828';
const MUTED  = '#667085';

/* ─── Pure helpers (re-exported for property testing) ────────────────────── */
import { buildShareableUrl, parseShareableUrl } from '../utils/shareable-url.js';
export { buildShareableUrl, parseShareableUrl };

/**
 * Validate whether a string is a parseable URL with http(s) scheme.
 */
function isValidUrl(str) {
  try {
    const u = new URL(str);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

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

/* ─── Share CTA section ──────────────────────────────────────────────────── */
function ShareCTA({ sessionId, originalUrl }) {
  const [copied, setCopied] = useState(false);
  const shareableUrl = buildShareableUrl(sessionId, originalUrl);
  const fullUrl = `${window.location.origin}${shareableUrl}`;

  function handleCopy() {
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleEmail() {
    const subject = encodeURIComponent('Proof360 Cold Read');
    const body = encodeURIComponent(`Check out this trust posture read: ${fullUrl}`);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_self');
  }

  function handleLinkedIn() {
    const encoded = encodeURIComponent(fullUrl);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`, '_blank');
  }

  const btnStyle = {
    padding: '8px 16px',
    background: 'none',
    color: NAVY,
    border: `1px solid ${BORDER}`,
    borderRadius: 7,
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: '"Outfit", sans-serif',
  };

  return (
    <div style={{
      marginTop: 20,
      padding: '16px 20px',
      background: OFFWHITE,
      borderRadius: 10,
      border: `1px solid ${BORDER}`,
      animation: 'fadeUp 0.5s ease both',
    }}>
      <p style={{
        fontSize: 12, fontWeight: 600, color: MUTED,
        fontFamily: '"IBM Plex Mono", monospace',
        marginBottom: 10, letterSpacing: '0.05em',
      }}>
        SHARE THIS READ
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={handleCopy} style={btnStyle}>
          {copied ? '✓ Copied' : 'Copy link'}
        </button>
        <button onClick={handleEmail} style={btnStyle}>
          Email
        </button>
        <button onClick={handleLinkedIn} style={btnStyle}>
          LinkedIn
        </button>
      </div>
    </div>
  );
}

/* ─── URL input form ─────────────────────────────────────────────────────── */
function UrlInputForm({ initialUrl, onSubmit }) {
  const [url, setUrl] = useState(initialUrl || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleFormSubmit(e) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;

    // Try adding https:// if no protocol
    let normalized = trimmed;
    if (!/^https?:\/\//i.test(normalized)) {
      normalized = `https://${normalized}`;
    }

    if (!isValidUrl(normalized)) {
      setError('Please enter a valid URL');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      await onSubmit(normalized);
    } catch (err) {
      setError(err.message || 'Something went wrong');
      setSubmitting(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', fontFamily: '"Outfit", sans-serif', background: WHITE }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
      <nav style={{
        padding: '0 32px', height: 52,
        display: 'flex', alignItems: 'center',
        borderBottom: `1px solid ${BORDER}`,
      }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: NAVY, letterSpacing: '-0.01em' }}>
          Proof<span style={{ color: AMBER }}>360</span>
        </span>
      </nav>
      <div style={{
        maxWidth: 480, margin: '0 auto',
        padding: '80px 24px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
      }}>
        <h1 style={{
          fontSize: 28, fontWeight: 700, color: NAVY,
          letterSpacing: '-0.03em', textAlign: 'center',
        }}>
          Run a cold read
        </h1>
        <p style={{ fontSize: 14, color: MUTED, textAlign: 'center' }}>
          Enter a company URL to see their public trust posture.
        </p>
        <form onSubmit={handleFormSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="text"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://example.com"
            autoFocus
            style={{
              width: '100%', padding: '12px 16px',
              fontSize: 15, color: TEXT,
              border: `1px solid ${BORDER}`,
              borderRadius: 8, outline: 'none',
              fontFamily: '"Outfit", sans-serif',
              boxSizing: 'border-box',
            }}
          />
          {error && <p style={{ fontSize: 13, color: '#F87171' }}>{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: '12px 0',
              background: submitting ? MUTED : AMBER,
              color: WHITE,
              fontSize: 15, fontWeight: 700,
              border: 'none', borderRadius: 8,
              cursor: submitting ? 'not-allowed' : 'pointer',
              fontFamily: '"Outfit", sans-serif',
            }}
          >
            {submitting ? 'Starting...' : 'Run cold read →'}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────── */
export default function AuditColdRead() {
  const [params]   = useSearchParams();
  const sessionParam = params.get('session');
  const urlParam     = params.get('url');
  const isDemo       = params.get('demo') === 'true';
  const navigate     = useNavigate();
  const flags        = useFeatureFlags();
  const mountedRef   = useRef(false);

  // Core state
  const [data,       setData]       = useState(null);
  const [error,      setError]      = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [loadingUrl, setLoadingUrl] = useState('');
  const [showForm,   setShowForm]   = useState(false);
  const [prefillUrl, setPrefillUrl] = useState('');
  const [currentSessionId, setCurrentSessionId] = useState(sessionParam || null);
  const [originalUrl, setOriginalUrl] = useState(urlParam || '');

  // 333 confirmation card state
  const [activeCard,  setActiveCard]  = useState(0);
  const [statuses,    setStatuses]    = useState({});
  const [corrections, setCorrections] = useState({});
  const [allDone,     setAllDone]     = useState(false);

  // Font loading
  useEffect(() => {
    const link = document.createElement('link');
    link.rel   = 'stylesheet';
    link.href  = 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap';
    document.head.appendChild(link);
    return () => link.remove();
  }, []);

  // ─── Mount logic: session-first lookup, auto-submit, or show form ──────
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    if (isDemo) { setData(DEMO_DATA); return; }

    // 1. Session param → try loading existing result
    if (sessionParam) {
      setLoading(true);
      setLoadingUrl(urlParam || '');
      getInferences(sessionParam)
        .then((result) => {
          setData(result);
          setCurrentSessionId(sessionParam);
          setLoading(false);
        })
        .catch((err) => {
          // Session not found / expired → fall back
          if (urlParam) {
            // Fall back to step 2: auto-submit with url param
            autoSubmitUrl(urlParam);
          } else {
            // No url param → show form
            setLoading(false);
            setShowForm(true);
          }
        });
      return;
    }

    // 2. Only url param → validate and auto-submit
    if (urlParam) {
      if (isValidUrl(urlParam)) {
        autoSubmitUrl(urlParam);
      } else {
        // Invalid URL → show form with pre-fill
        setShowForm(true);
        setPrefillUrl(urlParam);
      }
      return;
    }

    // 3. No params → show standard input form
    setShowForm(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function autoSubmitUrl(url) {
    setLoading(true);
    setLoadingUrl(url);
    setOriginalUrl(url);
    try {
      const { session_id } = await startSession({ website_url: url, source: 'share_link' });
      setCurrentSessionId(session_id);
      // Navigate to the reading/polling flow
      navigate(`/audit/reading?session=${session_id}&url=${encodeURIComponent(url)}`);
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Failed to start cold read');
      setShowForm(true);
      setPrefillUrl(url);
    }
  }

  async function handleFormStartColdRead(url) {
    setOriginalUrl(url);
    setLoading(true);
    setLoadingUrl(url);
    setShowForm(false);
    try {
      const { session_id } = await startSession({ website_url: url, source: 'share_link' });
      setCurrentSessionId(session_id);
      navigate(`/audit/reading?session=${session_id}&url=${encodeURIComponent(url)}`);
    } catch (err) {
      setLoading(false);
      setShowForm(true);
      setPrefillUrl(url);
      throw err; // Let the form handle the error display
    }
  }

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
      await submitSession(currentSessionId, { corrections, followup_answers: {} });
      navigate(`/processing?session=${currentSessionId}`);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  // ─── Render: URL input form ────────────────────────────────────────────
  if (showForm && !data) {
    return <UrlInputForm initialUrl={prefillUrl} onSubmit={handleFormStartColdRead} />;
  }

  // ─── Render: Loading state ─────────────────────────────────────────────
  if (loading && !data) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: '"Outfit", sans-serif', background: WHITE }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ width: 20, height: 20, border: `2px solid #1A1A2E`, borderTopColor: AMBER, borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: 16 }} />
      <p style={{ fontSize: 14, color: MUTED, fontFamily: '"IBM Plex Mono", monospace' }}>
        Running cold read for {loadingUrl}...
      </p>
    </div>
  );

  // ─── Render: Error without data ────────────────────────────────────────
  if (error && !data) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"Outfit", sans-serif', background: WHITE }}>
      <p style={{ color: MUTED }}>{error}</p>
    </div>
  );

  // ─── Render: Spinner while waiting for data ────────────────────────────
  if (!data) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: WHITE }}>
      <div style={{ width: 20, height: 20, border: `2px solid #1A1A2E`, borderTopColor: AMBER, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  // ─── Render: Data loaded — confirmation cards + share CTA + ribbon ─────
  return (
    <div style={{ background: WHITE, minHeight: '100vh', fontFamily: '"Outfit", sans-serif' }}>
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

      {/* Confidence Ribbon — shown when overall !== "high" */}
      {data.confidence && data.confidence.overall !== 'high' && (
        <ConfidenceRibbon confidence={data.confidence} />
      )}

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

        {/* Share CTA — gated by cold_read.shareable_url feature flag */}
        {flags?.cold_read?.shareable_url && currentSessionId && originalUrl && (
          <ShareCTA sessionId={currentSessionId} originalUrl={originalUrl} />
        )}
      </div>
    </div>
  );
}
