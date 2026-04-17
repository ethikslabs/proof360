import { useState, useEffect, useRef } from 'react';
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
const LIGHT  = '#98A2B3';

/* ─── Cisco intelligence hints ───────────────────────────────────────────── */
// Matched against question text — surfaces relevant Cisco products as hints
const CISCO_HINTS = [
  { match: /mfa|multi.factor|authenticat|identity|access control/i,
    hint: 'Cisco Duo covers this and deploys across your stack in under a day.' },
  { match: /network|firewall|perimeter|zero.trust|ztna/i,
    hint: 'Cisco Umbrella provides DNS-layer protection and zero trust access — no hardware.' },
  { match: /endpoint|edr|device|laptop|malware/i,
    hint: 'Cisco Secure Endpoint (formerly AMP) provides enterprise EDR with built-in threat intelligence.' },
  { match: /email|phishing|spam/i,
    hint: 'Cisco Secure Email blocks phishing at the gateway layer — enterprise standard.' },
  { match: /soc|compliance|audit|certif/i,
    hint: 'Cisco Security Cloud integrates compliance evidence collection across your stack.' },
  { match: /cloud|aws|infrastructure|hosting/i,
    hint: 'Cisco Multicloud Defense provides unified security across AWS and hybrid environments.' },
  { match: /incident|response|detect|siem|monitor/i,
    hint: 'Cisco SecureX unifies detection and response across network, endpoint, and cloud.' },
  { match: /vpn|remote|access|employee/i,
    hint: 'Cisco AnyConnect + Duo provides secure remote access with MFA in a single deployment.' },
];

/* ─── Demo mock data ─────────────────────────────────────────────────────── */
const DEMO_DATA = {
  company_name: 'Meridian Labs',
  source_summary: 'Read from meridian-labs.io — public website, LinkedIn signals, DNS records.',
  inferences: [
    { inference_id: 'i1', label: 'AWS-hosted infrastructure (ap-southeast-2)', confidence: 'confident' },
    { inference_id: 'i2', label: 'B2B SaaS — enterprise sales motion', confidence: 'confident' },
    { inference_id: 'i3', label: 'Series A stage, ~20–50 employees', confidence: 'likely' },
    { inference_id: 'i4', label: 'Selling into regulated industries (finance / health)', confidence: 'probable' },
    { inference_id: 'i5', label: 'No MFA enforcement detected on public-facing systems', confidence: 'confident' },
    { inference_id: 'i6', label: 'No SOC 2 or ISO 27001 certification found', confidence: 'confident' },
  ],
  correctable_fields: [
    { key: 'stage', label: 'Company stage', inferred_value: 'Series A' },
    { key: 'sector', label: 'Primary sector', inferred_value: 'Fintech / regulated SaaS' },
    { key: 'team_size', label: 'Team size', inferred_value: '20–50 employees' },
  ],
  followup_questions: [
    {
      question_id: 'q1',
      context: 'This affects which compliance frameworks apply to you',
      question: 'Are you actively selling into regulated industries — finance, healthcare, or government?',
      options: ['Yes — it\'s our primary market', 'Some deals, not the majority', 'No, but we\'re moving that way', 'Not yet'],
    },
    {
      question_id: 'q2',
      context: 'Identity and access control',
      question: 'How are your team currently authenticating to internal tools and cloud infrastructure?',
      options: ['Password only', 'MFA on some systems', 'MFA enforced everywhere', 'SSO with MFA'],
    },
    {
      question_id: 'q3',
      context: 'Incident response readiness',
      question: 'If you had a security incident today, do you have a documented response plan?',
      options: ['Yes, tested and documented', 'Informal plan, not documented', 'No plan yet', 'Not sure'],
    },
  ],
};

function getCiscoHint(questionText) {
  for (const { match, hint } of CISCO_HINTS) {
    if (match.test(questionText)) return hint;
  }
  return null;
}

/* ─── Opening paragraph ──────────────────────────────────────────────────── */
// Synthesises inferences into a human paragraph
function buildOpeningParagraph(companyName, inferences) {
  if (!inferences?.length) return null;
  const labels = inferences.map(i => i.label?.toLowerCase()).filter(Boolean);
  return `Based on your website, here's what we think we know about ${companyName}. We've read your public signals — infrastructure, identity posture, how you present to customers — and built an initial picture. Some of this will be exactly right. Some of it we've inferred. You can correct anything we got wrong.`;
}

/* ─── Typing indicator ───────────────────────────────────────────────────── */
function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '12px 16px' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: '50%',
          background: LIGHT,
          animation: `typingBounce 1.2s ease infinite`,
          animationDelay: `${i * 0.2}s`,
        }} />
      ))}
    </div>
  );
}

/* ─── Chat bubble ────────────────────────────────────────────────────────── */
function SystemBubble({ children, style = {} }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10, ...style,
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        background: NAVY, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, fontWeight: 700, color: AMBER,
        fontFamily: '"Outfit", sans-serif',
      }}>P</div>
      <div style={{
        background: OFFWHITE, border: `1px solid ${BORDER}`,
        borderRadius: '4px 12px 12px 12px',
        padding: '12px 16px', maxWidth: 460,
        fontSize: 14, color: TEXT, lineHeight: 1.7,
        fontFamily: '"Outfit", sans-serif',
      }}>
        {children}
      </div>
    </div>
  );
}

function UserBubble({ children }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{
        background: NAVY, color: WHITE,
        borderRadius: '12px 4px 12px 12px',
        padding: '10px 16px', maxWidth: 340,
        fontSize: 14, lineHeight: 1.6,
        fontFamily: '"Outfit", sans-serif',
      }}>
        {children}
      </div>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────── */
export default function AuditColdRead() {
  const [params]    = useSearchParams();
  const sessionId   = params.get('session');
  const isDemo      = params.get('demo') === 'true';
  const navigate    = useNavigate();

  const [data,        setData]        = useState(null);
  const [corrections, setCorrections] = useState({});
  const [editingKey,  setEditingKey]  = useState(null);
  const [editValue,   setEditValue]   = useState('');
  const [answers,     setAnswers]     = useState({});
  const [error,       setError]       = useState('');
  const [submitting,  setSubmitting]  = useState(false);

  // Chat state
  const [inferencesRevealed, setInferencesRevealed] = useState(false);
  const [showCorrections,    setShowCorrections]    = useState(false);
  const [chatStarted,        setChatStarted]        = useState(false);
  const [currentQ,           setCurrentQ]           = useState(0);
  const [showTyping,         setShowTyping]         = useState(false);
  const [questionsVisible,   setQuestionsVisible]   = useState([]);

  const scrollRef = useRef(null);

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
      .catch(() => setError('We couldn\'t load your results. Please try again.'));
  }, [sessionId, isDemo]);

  // Reveal inferences then show corrections offer
  useEffect(() => {
    if (!data) return;
    const delay = 800 + (data.inferences?.length || 0) * 900 + 600;
    const t = setTimeout(() => setInferencesRevealed(true), delay);
    return () => clearTimeout(t);
  }, [data]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [inferencesRevealed, showCorrections, chatStarted, questionsVisible, showTyping]);

  function startChat() {
    setChatStarted(true);
    const questions = data?.followup_questions || [];
    if (questions.length === 0) return;
    setShowTyping(true);
    setTimeout(() => {
      setShowTyping(false);
      setQuestionsVisible([0]);
    }, 1200);
  }

  function answerQuestion(questionId, option) {
    setAnswers(a => ({ ...a, [questionId]: option }));
    const questions = data?.followup_questions || [];
    const nextIndex = currentQ + 1;
    setCurrentQ(nextIndex);

    if (nextIndex < questions.length) {
      setShowTyping(true);
      setTimeout(() => {
        setShowTyping(false);
        setQuestionsVisible(prev => [...prev, nextIndex]);
      }, 1100);
    }
  }

  function handleCorrect(field) {
    setEditingKey(field.key);
    setEditValue(corrections[field.key] || field.inferred_value.replace(' (probable)', ''));
  }

  function saveCorrection(key) {
    setCorrections(c => ({ ...c, [key]: editValue }));
    setEditingKey(null);
  }

  async function handleSubmit() {
    if (isDemo) { navigate('/report/demo'); return; }
    setSubmitting(true); setError('');
    try {
      await submitSession(sessionId, { corrections, followup_answers: answers });
      navigate(`/processing?session=${sessionId}`);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  if (error && !data) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"Outfit", sans-serif', background: OFFWHITE }}>
      <p style={{ color: MUTED }}>{error}</p>
    </div>
  );

  if (!data) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: OFFWHITE }}>
      <div style={{ width: 20, height: 20, border: `2px solid ${BORDER}`, borderTopColor: NAVY, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const questions     = data.followup_questions || [];
  const allDone       = currentQ >= questions.length;
  const openingPara   = buildOpeningParagraph(data.company_name, data.inferences);

  return (
    <div style={{ background: WHITE, minHeight: '100vh', fontFamily: '"Outfit", sans-serif' }}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30%            { transform: translateY(-6px); opacity: 1; }
        }
        .fade-up { animation: fadeUp 0.4s ease both; }
      `}</style>

      {/* ── Nav ── */}
      <nav style={{ background: NAVY, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{
          maxWidth: 640, margin: '0 auto', padding: '0 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 52,
        }}>
          <span style={{ fontFamily: '"Outfit", sans-serif', fontSize: 18, fontWeight: 700, color: WHITE, letterSpacing: '-0.01em' }}>
            Proof<span style={{ color: AMBER }}>360</span>
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ADE80', display: 'inline-block' }} />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontFamily: '"IBM Plex Mono", monospace' }}>
              VERITAS · Cisco partner intelligence active
            </span>
          </div>
        </div>
      </nav>

      {/* ── Chat window ── */}
      <div
        ref={scrollRef}
        style={{
          maxWidth: 640, margin: '0 auto',
          padding: '36px 24px 160px',
          display: 'flex', flexDirection: 'column', gap: 20,
        }}
      >
        {/* Opening */}
        <div className="fade-up">
          <p style={{ fontSize: 11, color: LIGHT, fontFamily: '"IBM Plex Mono", monospace', marginBottom: 16 }}>
            {data.company_name}
          </p>
          <SystemBubble>
            {openingPara}
          </SystemBubble>
        </div>

        {/* Inferences */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 38 }}>
          {(data.inferences || []).map((inf, i) => (
            <InferenceItem key={inf.inference_id} inference={inf} delay={800 + i * 900} />
          ))}
        </div>

        {/* Source attribution + correction offer */}
        {inferencesRevealed && (
          <div className="fade-up" style={{ paddingLeft: 38 }}>
            <p style={{ fontSize: 12, color: LIGHT, fontFamily: '"IBM Plex Mono", monospace', marginBottom: 16 }}>
              {data.source_summary}
            </p>

            {data.correctable_fields?.length > 0 && !showCorrections && (
              <button
                onClick={() => setShowCorrections(true)}
                style={{
                  fontSize: 13, color: MUTED, background: 'none',
                  border: `1px solid ${BORDER}`, borderRadius: 6,
                  padding: '7px 14px', cursor: 'pointer',
                  fontFamily: '"Outfit", sans-serif',
                  transition: 'border-color 0.15s, color 0.15s',
                }}
              >
                Anything wrong? Fix it →
              </button>
            )}
          </div>
        )}

        {/* Corrections panel */}
        {showCorrections && data.correctable_fields?.length > 0 && (
          <div className="fade-up" style={{
            marginLeft: 38, background: OFFWHITE,
            border: `1px solid ${BORDER}`, borderRadius: 10, padding: 20,
          }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: TEXT, marginBottom: 14, fontFamily: '"Outfit", sans-serif' }}>
              Correct anything we got wrong
            </p>
            {data.correctable_fields.map(field => (
              <div key={field.key} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 0', borderBottom: `1px solid ${BORDER}`,
              }}>
                <div>
                  <p style={{ fontSize: 11, color: LIGHT, marginBottom: 3, fontFamily: '"IBM Plex Mono", monospace' }}>{field.label}</p>
                  {editingKey === field.key ? (
                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                      <input
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        autoFocus
                        style={{
                          fontSize: 13, border: `1px solid ${BORDER}`,
                          borderRadius: 5, padding: '5px 10px',
                          fontFamily: '"Outfit", sans-serif', color: TEXT, outline: 'none',
                        }}
                      />
                      <button onClick={() => saveCorrection(field.key)} style={{ fontSize: 12, color: '#16A34A', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontFamily: '"Outfit", sans-serif' }}>Save</button>
                      <button onClick={() => setEditingKey(null)} style={{ fontSize: 12, color: LIGHT, background: 'none', border: 'none', cursor: 'pointer', fontFamily: '"Outfit", sans-serif' }}>Cancel</button>
                    </div>
                  ) : (
                    <p style={{ fontSize: 13, color: TEXT }}>{corrections[field.key] || field.inferred_value}</p>
                  )}
                </div>
                {editingKey !== field.key && (
                  <button onClick={() => handleCorrect(field)} style={{ fontSize: 12, color: MUTED, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: '"Outfit", sans-serif' }}>
                    Correct
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Chat offer */}
        {inferencesRevealed && !chatStarted && questions.length > 0 && (
          <div className="fade-up">
            <SystemBubble>
              Want a sharper report? Answer a few questions — none or all, it's up to you. Each answer helps us be more accurate.
            </SystemBubble>
            <div style={{ display: 'flex', gap: 10, paddingLeft: 38, marginTop: 12 }}>
              <button
                onClick={startChat}
                style={{
                  padding: '9px 20px', background: NAVY, color: WHITE,
                  fontSize: 13, fontWeight: 600, border: 'none',
                  borderRadius: 6, cursor: 'pointer',
                  fontFamily: '"Outfit", sans-serif',
                }}
              >
                Sure, ask me →
              </button>
              <button
                onClick={handleSubmit}
                style={{
                  padding: '9px 20px', background: 'none', color: MUTED,
                  fontSize: 13, border: `1px solid ${BORDER}`,
                  borderRadius: 6, cursor: 'pointer',
                  fontFamily: '"Outfit", sans-serif',
                }}
              >
                Skip — show my report
              </button>
            </div>
          </div>
        )}

        {/* Chat questions */}
        {chatStarted && questionsVisible.map((qi) => {
          const q    = questions[qi];
          const ans  = answers[q.question_id];
          const hint = getCiscoHint(q.question);

          return (
            <div key={q.question_id} className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <SystemBubble>
                <p style={{ fontSize: 12, color: LIGHT, marginBottom: 6, fontFamily: '"IBM Plex Mono", monospace' }}>{q.context}</p>
                <p style={{ fontWeight: 500, color: TEXT }}>{q.question}</p>
              </SystemBubble>

              {!ans && (
                <div style={{ paddingLeft: 38, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {q.options.map(opt => (
                    <button
                      key={opt}
                      onClick={() => answerQuestion(q.question_id, opt)}
                      style={{
                        padding: '11px 16px',
                        background: WHITE, border: `1px solid ${BORDER}`,
                        borderRadius: 8, cursor: 'pointer',
                        fontSize: 14, color: TEXT, textAlign: 'left',
                        fontFamily: '"Outfit", sans-serif',
                        transition: 'border-color 0.15s, background 0.15s',
                      }}
                      onMouseEnter={e => { e.target.style.borderColor = NAVY; e.target.style.background = OFFWHITE; }}
                      onMouseLeave={e => { e.target.style.borderColor = BORDER; e.target.style.background = WHITE; }}
                    >
                      {opt}
                    </button>
                  ))}

                  {hint && (
                    <div style={{
                      display: 'flex', alignItems: 'flex-start', gap: 8,
                      padding: '10px 14px',
                      background: '#EFF6FF', border: '1px solid #DBEAFE',
                      borderRadius: 8, marginTop: 4,
                    }}>
                      <span style={{ fontSize: 12, flexShrink: 0 }}>💡</span>
                      <p style={{ fontSize: 12, color: '#1D4ED8', lineHeight: 1.6, fontFamily: '"Outfit", sans-serif' }}>
                        <strong>Cisco:</strong> {hint}
                      </p>
                    </div>
                  )}

                  <button
                    onClick={handleSubmit}
                    style={{
                      fontSize: 12, color: LIGHT, background: 'none',
                      border: 'none', cursor: 'pointer', textAlign: 'left',
                      padding: '4px 0', fontFamily: '"Outfit", sans-serif',
                      textDecoration: 'underline',
                    }}
                  >
                    That's enough — show me my report →
                  </button>
                </div>
              )}

              {ans && (
                <UserBubble>{ans}</UserBubble>
              )}
            </div>
          );
        })}

        {/* Typing indicator */}
        {showTyping && (
          <div style={{ paddingLeft: 38 }}>
            <div style={{
              display: 'inline-block',
              background: OFFWHITE, border: `1px solid ${BORDER}`,
              borderRadius: '4px 12px 12px 12px',
            }}>
              <TypingDots />
            </div>
          </div>
        )}

        {/* All questions answered */}
        {chatStarted && allDone && !showTyping && (
          <div className="fade-up">
            <SystemBubble>
              That's everything we need. Generating your report now.
            </SystemBubble>
          </div>
        )}
      </div>

      {/* ── Sticky footer CTA ── */}
      {inferencesRevealed && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(12px)',
          borderTop: `1px solid ${BORDER}`,
          padding: '16px 24px',
          zIndex: 100,
        }}>
          <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <p style={{ fontSize: 13, color: MUTED, fontFamily: '"Outfit", sans-serif' }}>
              {Object.keys(answers).length > 0
                ? `${Object.keys(answers).length} answer${Object.keys(answers).length > 1 ? 's' : ''} added — report is getting sharper`
                : 'Ready when you are'}
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              {error && <p style={{ fontSize: 12, color: '#DC2626', fontFamily: '"Outfit", sans-serif' }}>{error}</p>}
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  padding: '10px 24px',
                  background: submitting ? MUTED : AMBER,
                  color: WHITE,
                  fontSize: 14, fontWeight: 700,
                  border: 'none', borderRadius: 6,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  fontFamily: '"Outfit", sans-serif',
                  whiteSpace: 'nowrap',
                  transition: 'background 0.15s',
                }}
              >
                {submitting ? 'Generating...' : 'Generate my report →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Inference item ─────────────────────────────────────────────────────── */
function InferenceItem({ inference, delay }) {
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setResolved(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  const CONF_COLOR = {
    confident: { color: '#15803D', bg: '#F0FDF4', border: '#BBF7D0' },
    likely:    { color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' },
    probable:  { color: '#B45309', bg: '#FFFBEB', border: '#FDE68A' },
  };
  const conf = CONF_COLOR[inference.confidence] || CONF_COLOR.probable;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 14px',
      background: resolved ? OFFWHITE : WHITE,
      border: `1px solid ${BORDER}`,
      borderRadius: 8,
      transition: 'background 0.4s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {resolved ? (
          <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 10, color: '#16A34A' }}>✓</span>
          </div>
        ) : (
          <div style={{ width: 18, height: 18, border: `2px solid ${BORDER}`, borderTopColor: NAVY, borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }}>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}
        <span style={{ fontSize: 13, color: TEXT, fontFamily: '"Outfit", sans-serif' }}>{inference.label}</span>
      </div>
      {resolved && (
        <span style={{
          fontSize: 10, fontWeight: 600,
          color: conf.color, background: conf.bg,
          padding: '2px 8px', borderRadius: 20,
          border: `1px solid ${conf.border}`,
          fontFamily: '"Outfit", sans-serif',
          flexShrink: 0,
        }}>
          {inference.confidence}
        </span>
      )}
    </div>
  );
}
