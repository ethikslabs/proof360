import { useState, useEffect, useRef } from 'react';

const BASE = import.meta.env.VITE_API_BASE_URL ?? '';

const PERSONAS = {
  sophia:   { label: 'Sophia',   role: 'CMO', sublabel: 'Narrative lens',    initial: 'S', color: '#7c3aed', accent: '#a855f7', bubble: 'rgba(124,58,237,0.15)', border: 'rgba(124,58,237,0.28)', text: '#e9d5ff' },
  leonardo: { label: 'Leonardo', role: 'CEO', sublabel: 'Market & strategy', initial: 'L', color: '#d97706', accent: '#f59e0b', bubble: 'rgba(234,179,8,0.15)',   border: 'rgba(234,179,8,0.22)',   text: '#fef3c7' },
  edison:   { label: 'Edison',   role: 'CTO', sublabel: 'Technical lens',    initial: 'E', color: '#0d9488', accent: '#14b8a6', bubble: 'rgba(20,184,166,0.15)',  border: 'rgba(20,184,166,0.22)',  text: '#ccfbf1' },
};

const JOHN = { label: 'John', initial: 'J', color: '#0f766e', accent: '#5eead4', bubble: 'rgba(94,234,212,0.12)', border: 'rgba(94,234,212,0.3)', text: '#5eead4' };

const SOPHIA_OPENER = { role: 'assistant', persona: 'sophia', content: "I've looked at your results. What's weighing on you most right now?", uiOnly: true };

function normaliseName(name) {
  return (name || 'unknown').toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

function storageKey(companyName) {
  return `p360_thread_${normaliseName(companyName)}`;
}

function loadThread(companyName) {
  try { return JSON.parse(localStorage.getItem(storageKey(companyName)) || 'null') || []; }
  catch { return []; }
}

function saveThread(companyName, thread) {
  localStorage.setItem(storageKey(companyName), JSON.stringify(thread));
}

function buildApiMessages(thread, activePersona) {
  const messages = [];
  for (const msg of thread) {
    if (msg.uiOnly || msg.fromJohn) continue;
    if (msg.role === 'user') {
      if (messages.length && messages[messages.length - 1].role === 'user') {
        messages[messages.length - 1].content += `\n\n${msg.content}`;
      } else {
        messages.push({ role: 'user', content: msg.content });
      }
    } else if (msg.persona === activePersona) {
      messages.push({ role: 'assistant', content: msg.content });
    } else {
      const label = PERSONAS[msg.persona]?.label || msg.persona;
      const quoted = `[${label} said: "${msg.content}"]`;
      if (messages.length && messages[messages.length - 1].role === 'user') {
        messages[messages.length - 1].content += `\n\n${quoted}`;
      } else {
        messages.push({ role: 'user', content: quoted });
      }
    }
  }
  if (!messages.length || messages[messages.length - 1].role !== 'user') return null;
  return messages;
}

function Avatar({ persona, isJohn, size = 32 }) {
  if (isJohn) return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `linear-gradient(135deg, ${JOHN.color}, ${JOHN.accent})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 800, color: '#fff',
    }}>J</div>
  );
  const p = PERSONAS[persona];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `linear-gradient(135deg, ${p.color}, ${p.accent})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 800, color: '#fff',
    }}>
      {p.initial}
    </div>
  );
}

function JohnMessage({ msg }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      <Avatar isJohn size={22} />
      <div style={{ maxWidth: '82%' }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1.5px', color: JOHN.accent, marginBottom: 4, fontFamily: 'monospace' }}>
          JOHN
        </div>
        <div style={{ background: JOHN.bubble, borderRadius: '0 10px 10px 10px', padding: '9px 12px', border: `1px solid ${JOHN.border}` }}>
          {msg.content && (
            <p style={{ color: JOHN.text, fontSize: 13, lineHeight: 1.55, margin: 0, marginBottom: (msg.type === 'image' || msg.type === 'video') && msg.url ? 8 : 0 }}>
              {msg.content}
            </p>
          )}
          {msg.type === 'image' && msg.url && (
            <img src={msg.url} alt="from John" style={{ maxWidth: '100%', borderRadius: 6, display: 'block' }} />
          )}
          {msg.type === 'video' && msg.url && (
            <video src={msg.url} controls style={{ maxWidth: '100%', borderRadius: 6, display: 'block' }} />
          )}
        </div>
      </div>
    </div>
  );
}

export default function PersonaChat({ sessionId, context }) {
  const company_name = context?.company_name;
  const score        = context?.score;
  const website      = context?.website;
  const gaps         = context?.gaps;
  const strengths    = context?.strengths;
  const recon        = context?.recon;
  const active_gap   = context?.active_gap;

  const [activePersona, setActivePersona] = useState('sophia');
  const [expanded, setExpanded]           = useState(false);
  const [thread, setThread]               = useState([]);
  const [draft, setDraft]                 = useState('');
  const [streaming, setStreaming]         = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [lastJohnTs, setLastJohnTs]       = useState(0);
  const abortRef     = useRef(null);
  const pollRef      = useRef(null);
  const threadEndRef = useRef(null);
  const inputRef     = useRef(null);

  useEffect(() => {
    if (!company_name) return;
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
    setStreaming(false);
    setStreamingContent('');
    setDraft('');
    const loaded = loadThread(company_name);
    if (loaded.length === 0) {
      const seeded = [SOPHIA_OPENER];
      saveThread(company_name, seeded);
      setThread(seeded);
    } else {
      setThread(loaded);
    }
  }, [company_name]);

  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    if (expanded) threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread, streamingContent, expanded]);

  function startPolling() {
    if (pollRef.current || !sessionId) return;
    pollRef.current = setInterval(async () => {
      try {
        const res  = await fetch(`${BASE}/api/v1/session/${sessionId}/john-messages?after=${lastJohnTs}`);
        const data = await res.json();
        if (!data.messages?.length) return;
        const newTs = Math.max(...data.messages.map(m => m.ts));
        setLastJohnTs(newTs);
        setThread(prev => {
          const next = [...prev, ...data.messages.map(m => ({
            role: 'assistant', fromJohn: true,
            content: m.content, type: m.type, url: m.url,
          }))];
          if (company_name) saveThread(company_name, next);
          return next;
        });
      } catch {
        // polling — ignore errors
      }
    }, 3000);
  }

  function switchPersona(persona) {
    setActivePersona(persona);
    setExpanded(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function sendMessage() {
    const text = draft.trim();
    if (!text || streaming) return;

    const userMsg   = { role: 'user', content: text };
    const nextThread = [...thread, userMsg];
    setThread(nextThread);
    setDraft('');

    const isAtJohn = /@john\b/i.test(text);

    const apiMessages = buildApiMessages(nextThread, activePersona);
    if (!apiMessages) return;

    const controller = new AbortController();
    abortRef.current = controller;
    setStreaming(true);
    setStreamingContent('');

    try {
      const res = await fetch(`${BASE}/api/v1/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          persona: activePersona,
          messages: apiMessages,
          context: { company_name, score, website, gaps, strengths, recon, active_gap, session_id: sessionId },
        }),
      });

      if (!res.ok) throw new Error('chat_failed');

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let full = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setStreamingContent(full);
      }

      if (full.endsWith('[error]')) full = full.slice(0, -7).trimEnd() + ' [message failed]';

      const assistantMsg = { role: 'assistant', persona: activePersona, content: full };
      const finalThread  = [...nextThread, assistantMsg];
      setThread(finalThread);
      if (company_name) saveThread(company_name, finalThread);

      if (isAtJohn) startPolling();
    } catch (err) {
      if (err.name !== 'AbortError') {
        setThread(t => [...t, { role: 'assistant', persona: activePersona, content: '[message failed — please try again]' }]);
      }
    } finally {
      setStreaming(false);
      setStreamingContent('');
      abortRef.current = null;
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }

  const p      = PERSONAS[activePersona];
  const others = Object.keys(PERSONAS).filter(k => k !== activePersona);

  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200, fontFamily: '"DM Sans", sans-serif' }}>

      {expanded && (
        <div style={{
          background: '#0A1628',
          border: `1px solid ${p.border}`, borderBottom: 'none',
          borderRadius: '12px 12px 0 0',
          maxWidth: 600, margin: '0 auto',
          display: 'flex', flexDirection: 'column',
          height: '60vh', maxHeight: 520,
        }}>
          {/* Header */}
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${p.border}`, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <Avatar persona={activePersona} size={30} />
            <div style={{ flex: 1 }}>
              <div style={{ color: p.text, fontSize: 11, fontWeight: 700, letterSpacing: '0.07em' }}>{p.label.toUpperCase()}</div>
              <div style={{ color: '#6b7280', fontSize: 10 }}>{p.sublabel}</div>
            </div>
            {others.map(k => (
              <button key={k} onClick={() => switchPersona(k)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, opacity: 0.55, transition: 'opacity 0.15s' }}>
                <Avatar persona={k} size={24} />
              </button>
            ))}
            <button
              onClick={() => {
                Object.keys(localStorage).filter(k => k.startsWith('p360_')).forEach(k => localStorage.removeItem(k));
                const fresh = [SOPHIA_OPENER];
                setThread(fresh);
                setDraft('');
              }}
              title="Clear chat history"
              style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 13, cursor: 'pointer', padding: '0 0 0 4px', lineHeight: 1 }}>
              ↺
            </button>
            <button onClick={() => setExpanded(false)}
              style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 18, cursor: 'pointer', padding: '0 0 0 6px', lineHeight: 1 }}>
              ⌄
            </button>
          </div>

          {/* Thread */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {thread.map((m, i) => {
              if (m.fromJohn) return <JohnMessage key={i} msg={m} />;
              const isAssistant = m.role === 'assistant';
              const msgPersona  = m.persona || activePersona;
              const mp = PERSONAS[msgPersona];
              return (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', justifyContent: isAssistant ? 'flex-start' : 'flex-end' }}>
                  {isAssistant && <Avatar persona={msgPersona} size={22} />}
                  <div style={{
                    maxWidth: '82%',
                    background: isAssistant ? mp.bubble : 'rgba(255,255,255,0.08)',
                    borderRadius: isAssistant ? '0 10px 10px 10px' : '10px 0 10px 10px',
                    padding: '9px 12px',
                  }}>
                    <p style={{ color: isAssistant ? mp.text : '#f3f4f6', fontSize: 13, lineHeight: 1.55, margin: 0 }}>
                      {m.content}
                    </p>
                  </div>
                </div>
              );
            })}

            {streaming && streamingContent && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <Avatar persona={activePersona} size={22} />
                <div style={{ maxWidth: '82%', background: p.bubble, borderRadius: '0 10px 10px 10px', padding: '9px 12px' }}>
                  <p style={{ color: p.text, fontSize: 13, lineHeight: 1.55, margin: 0 }}>
                    {streamingContent}
                    <span style={{ display: 'inline-block', width: 7, height: 13, background: p.accent, borderRadius: 1, marginLeft: 2, verticalAlign: 'middle', animation: 'p360-blink 1s step-end infinite' }} />
                  </p>
                </div>
              </div>
            )}

            <div ref={threadEndRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '10px 12px', borderTop: `1px solid ${p.border}`, display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
            <div style={{ fontSize: 10, color: '#4b5563', fontFamily: 'monospace' }}>
              type <span style={{ color: JOHN.accent }}>@john</span> to message John directly
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                ref={inputRef}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder={`Ask ${p.label}…`}
                disabled={streaming}
                style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: `1px solid ${/@john\b/i.test(draft) ? JOHN.border : p.border}`, borderRadius: 7, padding: '8px 12px', color: /@john\b/i.test(draft) ? JOHN.text : p.text, fontSize: 13, outline: 'none', fontFamily: '"DM Sans", sans-serif', opacity: streaming ? 0.5 : 1, transition: 'border-color 0.2s, color 0.2s' }}
              />
              <button
                onClick={sendMessage}
                disabled={!draft.trim() || streaming}
                style={{ width: 34, height: 34, borderRadius: 7, flexShrink: 0, background: draft.trim() && !streaming ? (/@john\b/i.test(draft) ? JOHN.color : p.color) : 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', fontSize: 16, cursor: draft.trim() && !streaming ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >↑</button>
            </div>
          </div>
        </div>
      )}

      {/* Collapsed bar */}
      <div style={{ background: '#0A1628', borderTop: '1px solid rgba(124,58,237,0.25)', maxWidth: 600, margin: '0 auto', padding: '8px 14px 10px', display: expanded ? 'none' : 'flex', flexDirection: 'column', gap: 7 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {Object.entries(PERSONAS).map(([key, persona]) => (
            <button key={key} onClick={() => switchPersona(key)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, background: `linear-gradient(135deg, ${persona.color}, ${persona.accent})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: '#fff' }}>{persona.initial}</div>
              <span style={{ color: persona.accent, fontSize: 11, fontWeight: 600 }}>{persona.label}</span>
              <span style={{ color: '#9ca3af', fontSize: 11, fontWeight: 400 }}>({persona.role})</span>
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar persona={activePersona} size={26} />
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onFocus={() => setExpanded(true)}
            placeholder={`Ask ${p.label}…`}
            style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: `1px solid ${p.border}`, borderRadius: 7, padding: '7px 12px', color: p.text, fontSize: 13, outline: 'none', fontFamily: '"DM Sans", sans-serif', cursor: 'text' }}
          />
        </div>
      </div>

      <style>{`@keyframes p360-blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
    </div>
  );
}
