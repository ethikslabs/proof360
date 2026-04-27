import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { getStatus, resumeSession } from '../api/client';

const BG     = '#0a0d14';
const CARD   = '#131c2e';
const BORDER = '#1e293b';
const TEXT   = '#f1f5f9';
const MUTED  = '#64748b';
const AMBER  = '#E07B39';
const TEAL   = '#5eead4';
const GREEN  = '#22c55e';

const MESSAGES = [
  'Analysing your website security signals...',
  'Reviewing documentation indicators...',
  'Checking vendor risk posture...',
  'Cross-referencing enterprise trust frameworks...',
  'Mapping gaps to business outcomes...',
  'Preparing your trust report...',
];

export default function Processing() {
  const [params] = useSearchParams();
  const sessionId = params.get('session');
  const navigate = useNavigate();
  const [msgIndex, setMsgIndex] = useState(0);
  const [error, setError] = useState('');
  const [canResume, setCanResume] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setMsgIndex((i) => (i + 1) % MESSAGES.length);
      setTick((n) => n + 1);
    }, 2000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    let elapsed = 0;
    const poll = setInterval(async () => {
      elapsed += 2000;
      try {
        const { status } = await getStatus(sessionId);
        if (status === 'complete') {
          clearInterval(poll);
          navigate(`/report/${sessionId}`);
        } else if (status === 'failed') {
          clearInterval(poll);
          setError('Analysis stalled.');
          setCanResume(true);
        } else if (elapsed > 120000) {
          clearInterval(poll);
          setError('Analysis is taking too long.');
          setCanResume(true);
        }
      } catch { /* keep polling */ }
    }, 2000);
    return () => clearInterval(poll);
  }, [sessionId, navigate]);

  const dots = '.'.repeat((tick % 3) + 1).padEnd(3, ' ');

  return (
    <div style={{
      minHeight: '100vh', background: BG,
      display: 'flex', flexDirection: 'column',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-dot { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
        @keyframes slide-up { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      {/* Nav */}
      <nav style={{
        padding: '0 24px', height: 52,
        display: 'flex', alignItems: 'center',
        borderBottom: `1px solid ${BORDER}`,
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <img src="/glyph.svg" width={24} height={24} alt="" />
          <span style={{ fontSize: 15, fontWeight: 700, color: TEXT, letterSpacing: '-0.01em', fontFamily: 'inherit' }}>
            Proof<span style={{ color: TEAL }}>360</span>
          </span>
        </Link>
      </nav>

      {/* Center */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
      }}>
        <div style={{
          width: '100%', maxWidth: 400,
          background: CARD, border: `1px solid ${BORDER}`,
          borderRadius: 16, padding: '32px 28px',
          animation: 'slide-up 0.35s ease both',
        }}>
          {/* Status dot + spinner row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              border: `2px solid ${BORDER}`,
              borderTopColor: TEAL,
              animation: 'spin 0.9s linear infinite',
              flexShrink: 0,
            }} />
            <div>
              <p style={{
                fontSize: 9, letterSpacing: '2px', color: TEAL,
                fontFamily: '"SF Mono", "Fira Code", monospace',
                marginBottom: 4,
              }}>
                ANALYSING
              </p>
              <p style={{ fontSize: 13, color: TEXT, fontWeight: 500 }}>
                Building your trust read{dots}
              </p>
            </div>
          </div>

          {/* Progress message */}
          <div style={{
            background: '#0a0d14',
            border: `1px solid ${BORDER}`,
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: error ? 20 : 0,
          }}>
            <p style={{
              fontSize: 11, color: MUTED, lineHeight: 1.6,
              fontFamily: '"SF Mono", "Fira Code", monospace',
            }}>
              {MESSAGES[msgIndex]}
            </p>
          </div>

          {/* Error state */}
          {error && (
            <div style={{ animation: 'slide-up 0.3s ease both' }}>
              <p style={{
                fontSize: 12, color: '#ef4444',
                fontFamily: '"SF Mono", "Fira Code", monospace',
                marginBottom: 12,
              }}>
                ✗ {error}
              </p>
              {canResume && !resuming && (
                <button
                  onClick={async () => {
                    setResuming(true);
                    setCanResume(false);
                    setError('');
                    try {
                      await resumeSession(sessionId);
                      const poll = setInterval(async () => {
                        try {
                          const { status } = await getStatus(sessionId);
                          if (status === 'complete') { clearInterval(poll); navigate(`/report/${sessionId}`); }
                          else if (status === 'failed') { clearInterval(poll); setError('Analysis stalled again.'); setCanResume(true); setResuming(false); }
                        } catch { /* keep polling */ }
                      }, 2000);
                    } catch (err) {
                      setError(`Resume failed: ${err.message}`);
                      setCanResume(true);
                    }
                    setResuming(false);
                  }}
                  style={{
                    width: '100%', padding: '10px 0',
                    background: 'transparent', color: TEAL,
                    border: `1px solid ${TEAL}`, borderRadius: 8,
                    fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                    marginBottom: 8,
                  }}
                >
                  ↻ Resume analysis
                </button>
              )}
              {resuming && (
                <p style={{ fontSize: 11, color: MUTED, fontFamily: '"SF Mono", "Fira Code", monospace' }}>
                  Resuming...
                </p>
              )}
              <button
                onClick={() => navigate('/audit')}
                style={{
                  background: 'none', border: 'none',
                  fontSize: 12, color: MUTED,
                  cursor: 'pointer', textDecoration: 'underline',
                  display: 'block', margin: '8px auto 0', fontFamily: 'inherit',
                }}
              >
                Start again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
