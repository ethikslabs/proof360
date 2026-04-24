import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useFeatureFlags } from '../contexts/FeatureFlagContext.jsx';
import { submitPreread, getPrereadStatus } from '../api/client.js';
import { buildShareableUrl } from '../utils/shareable-url.js';
import ConfidenceChip from '../components/ConfidenceChip.jsx';
import { Proof360Mark } from '../components/Proof360Mark';

/* ─── Constants ──────────────────────────────────────────────────────────── */
const SESSION_KEY = 'admin_preread_key';
const POLL_INTERVAL = 3000;

const STATUS_COLOURS = {
  complete: '#16A34A',
  failed:   '#DC2626',
  running:  '#D97706',
  queued:   '#D97706',
};

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function parseUrls(raw) {
  return raw
    .split(/[\n,]+/)
    .map(s => s.trim())
    .filter(Boolean);
}

function isTerminal(status) {
  return status === 'complete' || status === 'failed';
}

function allTerminal(reads) {
  return reads.length > 0 && reads.every(r => isTerminal(r.status));
}

function generateMarkdown(reads) {
  const lines = ['# Pre-Read Batch Results\n'];
  for (const r of reads) {
    lines.push(`## ${r.url}`);
    lines.push(`- **Session ID:** ${r.session_id}`);
    lines.push(`- **Status:** ${r.status}`);
    if (r.status === 'complete') {
      const link = buildShareableUrl(r.session_id, r.url);
      lines.push(`- **Shareable link:** ${window.location.origin}${link}`);
    }
    if (r.confidence) {
      lines.push(`- **Confidence:** ${r.confidence.overall || r.confidence}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

function downloadMarkdown(reads) {
  const md = generateMarkdown(reads);
  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `preread-batch-${Date.now()}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ─── Component ───────────────────────────────────────────────────────── */
export default function AdminPreread() {
  const features = useFeatureFlags();
  const navigate = useNavigate();

  /* ── State ─────────────────────────────────────────────────────────── */
  const [adminKey, setAdminKey] = useState(() => sessionStorage.getItem(SESSION_KEY) || '');
  const [authenticated, setAuthenticated] = useState(() => !!sessionStorage.getItem(SESSION_KEY));
  const [urlText, setUrlText] = useState('');
  const [batchId, setBatchId] = useState(null);
  const [reads, setReads] = useState([]);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(null);
  const pollRef = useRef(null);

  /* ── Feature flag gate ─────────────────────────────────────────────── */
  useEffect(() => {
    if (features?.cold_read?.preread_tool === false) {
      navigate('/', { replace: true });
    }
  }, [features, navigate]);

  /* ── Polling ───────────────────────────────────────────────────────── */
  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback((id, key) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const data = await getPrereadStatus(id, key);
        setReads(data.reads || []);
        if (allTerminal(data.reads || [])) {
          stopPolling();
        }
      } catch {
        // Polling errors are non-fatal; keep trying
      }
    }, POLL_INTERVAL);
  }, [stopPolling]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  /* ── Handlers ──────────────────────────────────────────────────────── */
  function handleAuth(e) {
    e.preventDefault();
    const key = adminKey.trim();
    if (!key) return;
    sessionStorage.setItem(SESSION_KEY, key);
    setAuthenticated(true);
    setError(null);
  }

  async function handleBatch(e) {
    e.preventDefault();
    setError(null);
    const urls = parseUrls(urlText);
    if (urls.length === 0) { setError('Enter at least one URL.'); return; }

    const key = sessionStorage.getItem(SESSION_KEY);
    setSubmitting(true);
    try {
      const data = await submitPreread({ urls }, key);
      setBatchId(data.batch_id);
      setReads(data.reads || []);
      startPolling(data.batch_id, key);
    } catch (err) {
      if (err.status === 401) setError('Invalid admin key.');
      else if (err.status === 400) setError(err.message || 'Bad request — max 20 URLs per batch.');
      else if (err.status === 429) setError('Rate limited — please wait before submitting another batch.');
      else setError(err.message || 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopy(sessionId, url) {
    const link = `${window.location.origin}${buildShareableUrl(sessionId, url)}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(sessionId);
      setTimeout(() => setCopied(null), 2000);
    } catch { /* clipboard not available */ }
  }

  /* ── Render gate ───────────────────────────────────────────────────── */
  if (features?.cold_read?.preread_tool === false) return null;

  const done = reads.length > 0 && allTerminal(reads);

  return (
    <div style={{ background: '#FFFFFF', minHeight: '100vh', color: '#0D0D0F', fontFamily: '"DM Sans", sans-serif' }}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .btn-primary {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 13px 26px; background: #E07B39; color: #09090B;
          font-family: "DM Sans", sans-serif; font-weight: 500; font-size: 14px;
          letter-spacing: 0.02em; border-radius: 5px; text-decoration: none;
          transition: background 0.2s, transform 0.15s;
          border: none; cursor: pointer;
        }
        .btn-primary:hover { background: #C96D2E; transform: translateY(-1px); }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .btn-secondary {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 16px; background: transparent; color: #0B2545;
          font-family: "DM Sans", sans-serif; font-weight: 500; font-size: 13px;
          border: 1px solid #D1D5DB; border-radius: 5px;
          cursor: pointer; transition: background 0.2s, border-color 0.2s;
        }
        .btn-secondary:hover { background: #F3F4F6; border-color: #9CA3AF; }
      `}</style>

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(10,22,40,0.97)',
        backdropFilter: 'blur(16px)',
      }}>
        <div style={{
          maxWidth: 1100, margin: '0 auto', padding: '0 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 56,
        }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <Proof360Mark size={28} />
            <span style={{
              fontFamily: '"DM Sans", sans-serif',
              fontSize: 19, fontWeight: 700,
              color: '#FFFFFF', letterSpacing: '-0.02em',
            }}>
              Proof<span style={{ color: '#E07B39' }}>360</span>
            </span>
          </Link>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: '"IBM Plex Mono", monospace' }}>
            Admin · Pre-Read Tool
          </span>
        </div>
      </nav>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '48px 24px' }}>

        {/* ── Auth prompt ──────────────────────────────────────────────── */}
        {!authenticated && (
          <form onSubmit={handleAuth} style={{ maxWidth: 420 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0B2545', marginBottom: 8 }}>
              Admin Pre-Read
            </h1>
            <p style={{ fontSize: 14, color: '#667085', marginBottom: 24 }}>
              Enter your admin key to access the batch pre-read tool.
            </p>
            <input
              type="password"
              value={adminKey}
              onChange={e => setAdminKey(e.target.value)}
              placeholder="Admin key"
              aria-label="Admin key"
              style={{
                width: '100%', padding: '12px 16px', fontSize: 14,
                fontFamily: '"DM Sans", sans-serif',
                border: '1px solid #D1D5DB', borderRadius: 5,
                outline: 'none', marginBottom: 16,
                transition: 'border-color 0.2s',
              }}
              onFocus={e => { e.target.style.borderColor = '#E07B39'; }}
              onBlur={e => { e.target.style.borderColor = '#D1D5DB'; }}
            />
            <button type="submit" className="btn-primary">Continue</button>
          </form>
        )}

        {/* ── Batch input ─────────────────────────────────────────────── */}
        {authenticated && !batchId && (
          <form onSubmit={handleBatch}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0B2545', marginBottom: 8 }}>
              Batch Pre-Read
            </h1>
            <p style={{ fontSize: 14, color: '#667085', marginBottom: 24 }}>
              Paste company URLs below (one per line, or comma-separated). Max 20.
            </p>
            <textarea
              value={urlText}
              onChange={e => setUrlText(e.target.value)}
              placeholder={"https://example.com\nhttps://another.co"}
              aria-label="URLs to pre-read"
              rows={8}
              style={{
                width: '100%', padding: '12px 16px', fontSize: 14,
                fontFamily: '"IBM Plex Mono", monospace',
                border: '1px solid #D1D5DB', borderRadius: 5,
                outline: 'none', resize: 'vertical', marginBottom: 16,
                lineHeight: 1.7, transition: 'border-color 0.2s',
              }}
              onFocus={e => { e.target.style.borderColor = '#E07B39'; }}
              onBlur={e => { e.target.style.borderColor = '#D1D5DB'; }}
            />
            {error && (
              <p style={{ fontSize: 13, color: '#DC2626', marginBottom: 12 }}>{error}</p>
            )}
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Run batch'}
            </button>
          </form>
        )}

        {/* ── Status table ──────────────────────────────────────────────── */}
        {authenticated && batchId && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0B2545' }}>
                Batch Results
              </h1>
              <div style={{ display: 'flex', gap: 10 }}>
                {done && (
                  <button className="btn-secondary" onClick={() => downloadMarkdown(reads)}>
                    Download all as markdown
                  </button>
                )}
                <button className="btn-secondary" onClick={() => { setBatchId(null); setReads([]); setUrlText(''); setError(null); stopPolling(); }}>
                  New batch
                </button>
              </div>
            </div>

            {error && (
              <p style={{ fontSize: 13, color: '#DC2626', marginBottom: 12 }}>{error}</p>
            )}

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: '"DM Sans", sans-serif' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E5E7EB', textAlign: 'left' }}>
                    <th style={{ padding: '10px 12px', color: '#667085', fontWeight: 500 }}>URL</th>
                    <th style={{ padding: '10px 12px', color: '#667085', fontWeight: 500, width: 100 }}>Status</th>
                    <th style={{ padding: '10px 12px', color: '#667085', fontWeight: 500 }}>Shareable Link</th>
                    <th style={{ padding: '10px 12px', color: '#667085', fontWeight: 500, width: 140 }}>Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {reads.map((r, i) => {
                    const shareLink = r.status === 'complete'
                      ? `${window.location.origin}${buildShareableUrl(r.session_id, r.url)}`
                      : null;
                    const confidenceLevel = r.confidence?.overall || r.confidence;
                    return (
                      <tr key={r.session_id || i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                        <td style={{ padding: '10px 12px', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#0B2545' }}>
                          {r.url}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            fontSize: 12, fontWeight: 500,
                            color: STATUS_COLOURS[r.status] || '#667085',
                          }}>
                            <span style={{
                              width: 8, height: 8, borderRadius: '50%',
                              background: STATUS_COLOURS[r.status] || '#D1D5DB',
                              display: 'inline-block',
                            }} />
                            {r.status}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          {shareLink ? (
                            <button
                              className="btn-secondary"
                              style={{ padding: '4px 10px', fontSize: 12 }}
                              onClick={() => handleCopy(r.session_id, r.url)}
                            >
                              {copied === r.session_id ? 'Copied!' : 'Copy link'}
                            </button>
                          ) : (
                            <span style={{ color: '#D1D5DB' }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          {confidenceLevel && confidenceLevel !== 'high'
                            ? <ConfidenceChip level={confidenceLevel} />
                            : confidenceLevel === 'high'
                              ? <span style={{ fontSize: 12, color: '#16A34A', fontWeight: 500 }}>high</span>
                              : <span style={{ color: '#D1D5DB' }}>—</span>
                          }
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {!done && reads.length > 0 && (
              <p style={{ fontSize: 12, color: '#667085', marginTop: 16, fontFamily: '"IBM Plex Mono", monospace' }}>
                Polling every 3s… {reads.filter(r => isTerminal(r.status)).length}/{reads.length} complete
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
