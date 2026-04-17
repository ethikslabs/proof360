import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { startSession } from '../api/client';

/* ─── Proof360 logo mark ─────────────────────────────────────────────────── */
function Proof360Mark({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="7" fill="#0B2545" />
      {/* Shield outline */}
      <path
        d="M16 5L25 8.8V15.5C25 20.5 21 24.8 16 26.5C11 24.8 7 20.5 7 15.5V8.8L16 5Z"
        stroke="#E07B39" strokeWidth="1.4" fill="none"
      />
      {/* Checkmark */}
      <path
        d="M11.5 16L14.5 19L20.5 13"
        stroke="#E07B39" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Audit() {
  const [url, setUrl] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();
  const navigate = useNavigate();

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap';
    document.head.appendChild(link);
    return () => link.remove();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!url && !file) { setError('Paste a URL to get started.'); return; }
    setError('');
    setLoading(true);
    try {
      const body = {};
      if (url) body.website_url = url;
      const { session_id } = await startSession(body);
      navigate(`/audit/reading?session=${session_id}&url=${encodeURIComponent(url)}`);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f?.type === 'application/pdf') setFile(f);
  }

  const NAVY  = '#0B2545';
  const AMBER = '#E07B39';
  const WHITE = '#FFFFFF';
  const MUTED = '#667085';
  const BORDER = '#E4E7EC';
  const OFFWHITE = '#F7F8FA';

  return (
    <div style={{
      minHeight: '100vh', background: OFFWHITE,
      display: 'flex', flexDirection: 'column',
      fontFamily: '"Outfit", sans-serif',
    }}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        input:focus { outline: none; border-color: #0B2545 !important; }
        .audit-input { transition: border-color 0.2s; }
        .audit-input:focus { border-color: #0B2545 !important; }
        .submit-btn { transition: background 0.2s, transform 0.15s; }
        .submit-btn:hover:not(:disabled) { background: #C96D2E !important; transform: translateY(-1px); }
        .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>

      {/* Nav */}
      <nav style={{
        padding: '0 32px', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: `1px solid ${BORDER}`, background: WHITE,
      }}>
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 9 }}>
          <Proof360Mark size={28} />
          <span style={{ fontFamily: '"Outfit", sans-serif', fontSize: 17, fontWeight: 700, color: NAVY, letterSpacing: '-0.01em' }}>
            Proof<span style={{ color: AMBER }}>360</span>
          </span>
        </Link>
        <Link to="/report/demo" style={{ fontSize: 13, color: MUTED, textDecoration: 'none' }}>
          See example report
        </Link>
      </nav>

      {/* Body */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '48px 24px',
      }}>
        <div style={{ width: '100%', maxWidth: 480 }}>

          {/* Header */}
          <div style={{ marginBottom: 36 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              border: `1px solid #D0D5DD`,
              borderRadius: 20, padding: '4px 12px', marginBottom: 20,
              background: WHITE,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16A34A', display: 'inline-block' }} />
              <span style={{ fontSize: 11, color: MUTED, fontFamily: '"IBM Plex Mono", monospace', letterSpacing: '0.05em' }}>
                VERITAS · live trust intelligence
              </span>
            </div>
            <h1 style={{
              fontSize: 28, fontWeight: 700, color: NAVY,
              letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 10,
            }}>
              Cold-read your trust posture
            </h1>
            <p style={{ fontSize: 15, color: MUTED, lineHeight: 1.65 }}>
              Paste your website URL. We'll read your public signals, query VERITAS, and return a scored gap report in 90 seconds.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://yourcompany.com"
              className="audit-input"
              style={{
                width: '100%', padding: '13px 16px',
                fontSize: 15, color: NAVY,
                border: `1.5px solid ${BORDER}`, borderRadius: 8,
                background: WHITE, fontFamily: '"Outfit", sans-serif',
              }}
            />

            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              style={{
                width: '100%', padding: '14px 16px',
                fontSize: 14, color: dragOver ? NAVY : MUTED,
                border: `1.5px dashed ${dragOver ? NAVY : BORDER}`,
                borderRadius: 8, background: dragOver ? '#F0F4FF' : WHITE,
                textAlign: 'center', cursor: 'pointer',
                fontFamily: '"Outfit", sans-serif',
                transition: 'all 0.15s',
              }}
            >
              {file ? `📄 ${file.name}` : 'Drop pitch deck here · PDF, max 10MB (optional)'}
            </div>
            <input ref={fileRef} type="file" accept=".pdf" style={{ display: 'none' }}
              onChange={e => setFile(e.target.files?.[0] || null)} />

            {error && (
              <p style={{ fontSize: 13, color: '#DC2626', fontFamily: '"Outfit", sans-serif' }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="submit-btn"
              style={{
                width: '100%', padding: '14px',
                background: loading ? NAVY : AMBER,
                color: WHITE, fontSize: 15, fontWeight: 600,
                border: 'none', borderRadius: 8, cursor: 'pointer',
                fontFamily: '"Outfit", sans-serif', letterSpacing: '0.01em',
                marginTop: 4,
              }}
            >
              {loading ? 'Starting analysis...' : 'Run trust audit →'}
            </button>
          </form>

          <p style={{ marginTop: 20, fontSize: 12, color: '#98A2B3', textAlign: 'center', lineHeight: 1.6 }}>
            No account required · takes ~90 seconds · we only read public signals
          </p>
        </div>
      </div>
    </div>
  );
}
