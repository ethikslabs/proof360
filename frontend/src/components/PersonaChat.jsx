// frontend/src/components/PersonaChat.jsx
import { useState, useEffect, useRef } from 'react';

const BASE = import.meta.env.VITE_API_BASE_URL ?? '';

const PERSONAS = {
  sophia:   { label: 'Sophia',   sublabel: 'Narrative lens',    initial: 'S', color: '#7c3aed', accent: '#a855f7', bg: 'rgba(124,58,237,0.09)', border: 'rgba(124,58,237,0.28)', bubble: 'rgba(124,58,237,0.15)', text: '#e9d5ff' },
  leonardo: { label: 'Leonardo', sublabel: 'Market & strategy', initial: 'L', color: '#d97706', accent: '#f59e0b', bg: 'rgba(234,179,8,0.07)',   border: 'rgba(234,179,8,0.22)',   bubble: 'rgba(234,179,8,0.15)',   text: '#fef3c7' },
  edison:   { label: 'Edison',   sublabel: 'Technical lens',    initial: 'E', color: '#0d9488', accent: '#14b8a6', bg: 'rgba(20,184,166,0.07)',  border: 'rgba(20,184,166,0.22)',  bubble: 'rgba(20,184,166,0.15)',  text: '#ccfbf1' },
};

const SOPHIA_OPENER = { role: 'assistant', content: "I've looked at your results. What's weighing on you most right now?", uiOnly: true };

function normaliseName(name) {
  return (name || 'unknown').toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

function storageKey(persona, companyName) {
  return `p360_persona_${persona}_${normaliseName(companyName)}`;
}

function loadThread(persona, companyName) {
  try { return JSON.parse(localStorage.getItem(storageKey(persona, companyName)) || 'null') || []; }
  catch { return []; }
}

function saveThread(persona, companyName, thread) {
  localStorage.setItem(storageKey(persona, companyName), JSON.stringify(thread));
}

function Avatar({ persona, size = 32 }) {
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

export default function PersonaChat({ context }) {
  const { company_name, score, website, gaps } = context || {};

  const [activePersona, setActivePersona] = useState('sophia');
  const [expanded, setExpanded] = useState(false);
  const [threads, setThreads] = useState({ sophia: [], leonardo: [], edison: [] });
  const [drafts, setDrafts] = useState({ sophia: '', leonardo: '', edison: '' });
  const [streamingPersona, setStreamingPersona] = useState(null);
  const [streamingContent, setStreamingContent] = useState('');
  const abortRef = useRef(null);
  const threadEndRef = useRef(null);

  // Load threads on mount / context change
  useEffect(() => {
    if (!company_name) return;

    // Abort any in-flight stream
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setStreamingPersona(null);
    setStreamingContent('');
    setDrafts({ sophia: '', leonardo: '', edison: '' });

    const loaded = {
      sophia:   loadThread('sophia',   company_name),
      leonardo: loadThread('leonardo', company_name),
      edison:   loadThread('edison',   company_name),
    };
    // Seed Sophia opener if empty
    if (loaded.sophia.length === 0) {
      loaded.sophia = [SOPHIA_OPENER];
      saveThread('sophia', company_name, loaded.sophia);
    }
    setThreads(loaded);
  }, [company_name]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { if (abortRef.current) abortRef.current.abort(); };
  }, []);

  // Auto-scroll thread to bottom
  useEffect(() => {
    if (expanded) threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [threads, streamingContent, expanded]);

  function switchPersona(persona) {
    setActivePersona(persona);
    setExpanded(true);
  }

  async function sendMessage() {
    const draft = drafts[activePersona].trim();
    if (!draft || streamingPersona) return;

    const userMessage = { role: 'user', content: draft };
    const nextThread = [...threads[activePersona], userMessage];
    setThreads(t => ({ ...t, [activePersona]: nextThread }));
    setDrafts(d => ({ ...d, [activePersona]: '' }));

    const controller = new AbortController();
    abortRef.current = controller;
    setStreamingPersona(activePersona);
    setStreamingContent('');

    try {
      const res = await fetch(`${BASE}/api/v1/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          persona: activePersona,
          messages: nextThread.filter(m => !m.uiOnly),
          context: { company_name, score, website, gaps },
        }),
      });

      if (!res.ok) throw new Error('chat_failed');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        full += chunk;
        setStreamingContent(full);
      }

      if (full.endsWith('[error]')) {
        full = full.slice(0, -7).trimEnd() + ' [message failed]';
      }

      const assistantMessage = { role: 'assistant', content: full };
      const finalThread = [...nextThread, assistantMessage];
      setThreads(t => ({ ...t, [activePersona]: finalThread }));
      saveThread(activePersona, company_name, finalThread);
    } catch (err) {
      if (err.name !== 'AbortError') {
        const errThread = [...nextThread, { role: 'assistant', content: '[message failed — please try again]' }];
        setThreads(t => ({ ...t, [activePersona]: errThread }));
      }
    } finally {
      setStreamingPersona(null);
      setStreamingContent('');
      abortRef.current = null;
    }
  }

  const p = PERSONAS[activePersona];
  const others = Object.keys(PERSONAS).filter(k => k !== activePersona);
  const currentThread = threads[activePersona] || [];

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
      fontFamily: '"DM Sans", sans-serif',
    }}>
      {/* Expanded panel */}
      {expanded && (
        <div style={{
          background: '#0A1628',
          border: `1px solid ${p.border}`,
          borderBottom: 'none',
          borderRadius: '12px 12px 0 0',
          maxWidth: 600, margin: '0 auto',
          display: 'flex', flexDirection: 'column',
          height: '60vh', maxHeight: 520,
        }}>
          {/* Panel header */}
          <div style={{
            padding: '12px 16px',
            borderBottom: `1px solid ${p.border}`,
            display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
          }}>
            <Avatar persona={activePersona} size={30} />
            <div style={{ flex: 1 }}>
              <div style={{ color: p.text, fontSize: 11, fontWeight: 700, letterSpacing: '0.07em' }}>{p.label.toUpperCase()}</div>
              <div style={{ color: '#6b7280', fontSize: 10 }}>{p.sublabel}</div>
            </div>
            {/* Other persona chips */}
            <div style={{ display: 'flex', gap: 6 }}>
              {others.map(k => (
                <button key={k} onClick={() => switchPersona(k)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, opacity: 0.7 }}>
                  <Avatar persona={k} size={24} />
                </button>
              ))}
            </div>
            {/* Collapse */}
            <button onClick={() => setExpanded(false)}
              style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 18, cursor: 'pointer', padding: '0 0 0 6px', lineHeight: 1 }}>
              ⌄
            </button>
          </div>

          {/* Thread */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '14px 16px',
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            {currentThread.map((m, i) => {
              const isAssistant = m.role === 'assistant';
              return (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', justifyContent: isAssistant ? 'flex-start' : 'flex-end' }}>
                  {isAssistant && <Avatar persona={activePersona} size={22} />}
                  <div style={{
                    maxWidth: '82%',
                    background: isAssistant ? p.bubble : 'rgba(255,255,255,0.08)',
                    borderRadius: isAssistant ? '0 10px 10px 10px' : '10px 0 10px 10px',
                    padding: '9px 12px',
                  }}>
                    <p style={{ color: isAssistant ? p.text : '#f3f4f6', fontSize: 13, lineHeight: 1.55, margin: 0 }}>
                      {m.content}
                    </p>
                  </div>
                </div>
              );
            })}

            {/* Streaming message */}
            {streamingPersona === activePersona && streamingContent && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <Avatar persona={activePersona} size={22} />
                <div style={{ maxWidth: '82%', background: p.bubble, borderRadius: '0 10px 10px 10px', padding: '9px 12px' }}>
                  <p style={{ color: p.text, fontSize: 13, lineHeight: 1.55, margin: 0 }}>
                    {streamingContent}
                    <span style={{
                      display: 'inline-block', width: 7, height: 13, background: p.accent,
                      borderRadius: 1, marginLeft: 2, verticalAlign: 'middle',
                      animation: 'p360-blink 1s step-end infinite',
                    }} />
                  </p>
                </div>
              </div>
            )}

            <div ref={threadEndRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: '10px 12px', borderTop: `1px solid ${p.border}`,
            display: 'flex', gap: 8, flexShrink: 0,
          }}>
            <input
              value={drafts[activePersona]}
              onChange={e => setDrafts(d => ({ ...d, [activePersona]: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder={`Ask ${p.label}…`}
              disabled={!!streamingPersona}
              style={{
                flex: 1, background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${p.border}`, borderRadius: 7,
                padding: '8px 12px', color: p.text, fontSize: 13,
                outline: 'none', fontFamily: '"DM Sans", sans-serif',
                opacity: streamingPersona ? 0.5 : 1,
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!drafts[activePersona].trim() || !!streamingPersona}
              style={{
                width: 34, height: 34, borderRadius: 7, flexShrink: 0,
                background: drafts[activePersona].trim() && !streamingPersona ? p.color : 'rgba(255,255,255,0.08)',
                border: 'none', color: '#fff', fontSize: 16,
                cursor: drafts[activePersona].trim() && !streamingPersona ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >↑</button>
          </div>
        </div>
      )}

      {/* Collapsed bar */}
      <div style={{
        background: '#0A1628',
        borderTop: `1px solid ${expanded ? 'transparent' : p.border}`,
        maxWidth: 600, margin: '0 auto',
        padding: '10px 14px',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <Avatar persona={activePersona} size={28} />
        <input
          value={expanded ? '' : drafts[activePersona]}
          onChange={e => {
            if (!expanded) setDrafts(d => ({ ...d, [activePersona]: e.target.value }));
          }}
          onFocus={() => setExpanded(true)}
          placeholder={`Ask ${p.label}…`}
          style={{
            flex: 1, background: 'rgba(255,255,255,0.05)',
            border: `1px solid ${p.border}`, borderRadius: 7,
            padding: '7px 12px', color: p.text, fontSize: 13,
            outline: 'none', fontFamily: '"DM Sans", sans-serif', cursor: 'text',
          }}
        />
        {others.map(k => (
          <button key={k} onClick={() => switchPersona(k)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <Avatar persona={k} size={26} />
          </button>
        ))}
      </div>

      <style>{`
        @keyframes p360-blink { 0%,100%{opacity:1} 50%{opacity:0} }
      `}</style>
    </div>
  );
}
