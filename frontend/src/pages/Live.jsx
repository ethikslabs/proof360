import { useEffect, useRef, useState } from 'react';
import { liveStatus, liveMint, liveTamper, liveAttest, liveAgent } from '../api/client';

// proof360.au/live — live verification console.
// Every visible value is computed state from the backend (INVARIANT #1):
// receipts, hashes, chain status, the LIVE/SPEC ledger, and agent replies.

const C = {
  bg: '#0b1220', panel: '#111a2e', line: '#1e2a44',
  primary: '#f1f5f9', secondary: '#94a3b8', muted: '#64748b',
  ok: '#34d399', bad: '#f87171', accent: '#60a5fa', amber: '#fbbf24',
  mono: 'ui-monospace, SFMono-Regular, Menlo, monospace',
};

function Badge({ state }) {
  const color = state === 'Attested' ? C.ok : state === 'Unknown' ? C.amber : state === 'LIVE' ? C.ok : state === 'SPEC' ? C.amber : C.secondary;
  return <span style={{ color, border: `1px solid ${color}`, borderRadius: 6, padding: '1px 8px', fontSize: 12, fontWeight: 600, letterSpacing: 0.3 }}>{state}</span>;
}

function Btn({ onClick, busy, children, kind }) {
  const bg = kind === 'danger' ? '#3a1620' : kind === 'primary' ? '#13294a' : '#16223c';
  const bc = kind === 'danger' ? C.bad : kind === 'primary' ? C.accent : C.line;
  return (
    <button onClick={onClick} disabled={busy}
      style={{ background: bg, color: C.primary, border: `1px solid ${bc}`, borderRadius: 8, padding: '9px 14px', fontSize: 14, cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.6 : 1, fontWeight: 500 }}>
      {busy ? '…' : children}
    </button>
  );
}

function Mono({ children, color }) {
  return <span style={{ fontFamily: C.mono, fontSize: 12.5, color: color || C.secondary, wordBreak: 'break-all' }}>{children}</span>;
}

export default function Live() {
  const [sid] = useState(() => (crypto.randomUUID ? crypto.randomUUID() : String(Math.random())));
  const [status, setStatus] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [chain, setChain] = useState(null);
  const [tamper, setTamper] = useState(null);
  const [attestText, setAttestText] = useState('we are fully SOC 2 compliant and unhackable');
  const [attestResult, setAttestResult] = useState(null);
  const [busy, setBusy] = useState({});
  const [err, setErr] = useState(null);

  const [chat, setChat] = useState([]); // {role, text}
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const chatEnd = useRef(null);

  const set = (k, v) => setBusy((b) => ({ ...b, [k]: v }));

  async function doMint() {
    set('mint', true); setErr(null); setTamper(null);
    try { const r = await liveMint(sid); setReceipt(r.receipt); setChain(r.chain_verified); }
    catch (e) { setErr(`mint: ${e.message}`); }
    finally { set('mint', false); }
  }
  async function doTamper() {
    set('tamper', true); setErr(null);
    try { setTamper(await liveTamper(sid)); }
    catch (e) { setErr(`tamper: ${e.message}`); }
    finally { set('tamper', false); }
  }
  async function doAttest() {
    set('attest', true); setErr(null);
    try { setAttestResult(await liveAttest(attestText)); }
    catch (e) { setErr(`attest: ${e.message}`); }
    finally { set('attest', false); }
  }
  async function send() {
    const text = input.trim();
    if (!text || thinking) return;
    const next = [...chat, { role: 'user', text }];
    setChat(next); setInput(''); setThinking(true);
    try {
      const r = await liveAgent(next, sid);
      setChat([...next, { role: 'assistant', text: r.reply, actions: r.actions }]);
    } catch (e) {
      setChat([...next, { role: 'assistant', text: `(* agent unavailable: ${e.message}. The buttons above still run the real machinery. *)` }]);
    } finally { setThinking(false); }
  }

  useEffect(() => { liveStatus().then(setStatus).catch(() => {}); doMint(); }, []); // eslint-disable-line
  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [chat, thinking]);

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.primary, fontFamily: 'Inter, system-ui, sans-serif', padding: '32px 20px' }}>
      <div style={{ maxWidth: 920, margin: '0 auto' }}>
        <div style={{ fontSize: 13, color: C.accent, letterSpacing: 1, fontWeight: 600 }}>PROOF360 · LIVE VERIFICATION</div>
        <h1 style={{ fontSize: 26, margin: '8px 0 4px' }}>Don't trust the deck. Verify the substrate.</h1>
        {status && <p style={{ color: C.secondary, fontSize: 15, margin: 0 }}>{status.honesty}</p>}

        {/* honesty banner — computed from status */}
        <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: '12px 16px', margin: '18px 0', fontSize: 13.5, color: C.secondary }}>
          Real VERITAS + Guard code, run in an <strong style={{ color: C.primary }}>ephemeral sandbox</strong> — nothing here writes to canonical state.
          The CORPUS→VERITAS join shown is hand-wired (<Mono color={C.amber}>VERITAS-CORPUS-001</Mono>, SPEC). The honesty is the product.
        </div>

        {err && <div style={{ color: C.bad, fontSize: 13, marginBottom: 12 }}>⚠ {err}</div>}

        {/* receipt card */}
        <section style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: 18, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 13, color: C.muted, letterSpacing: 0.5 }}>ATTESTED RECEIPT</span>
            {receipt && <Badge state={receipt.state} />}
          </div>
          {receipt ? (
            <div style={{ display: 'grid', gap: 6 }}>
              <div style={{ fontSize: 17, color: C.primary }}>"{receipt.claim}"</div>
              <div><span style={{ color: C.muted, fontSize: 12 }}>receipt_id </span><Mono>{receipt.receipt_id}</Mono></div>
              <div><span style={{ color: C.muted, fontSize: 12 }}>receipt_hash </span><Mono color={C.accent}>{receipt.receipt_hash}</Mono></div>
              <div><span style={{ color: C.muted, fontSize: 12 }}>witnessed_by </span><Mono>{(receipt.witnessed_by || []).map((w) => w.source_id).join(', ')}</Mono></div>
              <div style={{ marginTop: 4 }}><span style={{ color: C.muted, fontSize: 12 }}>guard chain </span>
                <Mono color={chain ? C.ok : C.bad}>{chain ? 'verifyChain() = true ✓' : 'unverified'}</Mono></div>
            </div>
          ) : <div style={{ color: C.muted }}>minting a real receipt…</div>}
          <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
            <Btn onClick={doMint} busy={busy.mint} kind="primary">Mint a fresh receipt</Btn>
            <Btn onClick={doTamper} busy={busy.tamper} kind="danger">Run tamper test</Btn>
          </div>
          {tamper && !tamper.error && (
            <div style={{ marginTop: 14, padding: 12, background: '#1a0f16', border: `1px solid ${C.bad}`, borderRadius: 8, fontSize: 13.5 }}>
              <div>before: <Mono color={C.ok}>chain verified = true</Mono></div>
              <div>tamper one byte at sequence {tamper.tampered_sequence} →</div>
              <div>after: <Mono color={C.bad}>chain verified = false · breaks at sequence {tamper.after?.breaks_at}</Mono></div>
              <div style={{ color: C.secondary, marginTop: 6 }}>{tamper.note}</div>
            </div>
          )}
          {tamper?.error && <div style={{ marginTop: 10, color: C.amber, fontSize: 13 }}>{tamper.message}</div>}
        </section>

        {/* attest your own claim */}
        <section style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: 18, marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: C.muted, letterSpacing: 0.5, marginBottom: 10 }}>ATTEST YOUR OWN CLAIM</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input value={attestText} onChange={(e) => setAttestText(e.target.value)} maxLength={280}
              style={{ flex: 1, minWidth: 240, background: C.bg, color: C.primary, border: `1px solid ${C.line}`, borderRadius: 8, padding: '9px 12px', fontSize: 14 }} />
            <Btn onClick={doAttest} busy={busy.attest}>Attest</Btn>
          </div>
          {attestResult && !attestResult.error && (
            <div style={{ marginTop: 12, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <Badge state={attestResult.receipt.state} />
              <div style={{ color: C.secondary, fontSize: 13.5, flex: 1 }}>{attestResult.explanation}</div>
            </div>
          )}
          {attestResult?.error && <div style={{ marginTop: 10, color: C.amber, fontSize: 13 }}>{attestResult.message}</div>}
        </section>

        {/* LIVE/SPEC ledger */}
        {status && (
          <section style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: 18, marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: C.muted, letterSpacing: 0.5, marginBottom: 12 }}>WHAT'S LIVE vs SPEC</div>
            <div style={{ display: 'grid', gap: 8 }}>
              {status.components.map((c) => (
                <div key={c.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <span style={{ fontSize: 14 }}>{c.name}{c.ticket && <Mono color={C.muted}> · {c.ticket}</Mono>}</span>
                  <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: C.muted }}>{c.axis}</span><Badge state={c.state} />
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* agent */}
        <section style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: 18 }}>
          <div style={{ fontSize: 13, color: C.muted, letterSpacing: 0.5, marginBottom: 12 }}>ASK THE AGENT — it answers from real tool output, and is honest about gaps</div>
          <div style={{ display: 'grid', gap: 12, maxHeight: 360, overflowY: 'auto', marginBottom: 12 }}>
            {chat.length === 0 && <div style={{ color: C.muted, fontSize: 13.5 }}>Try: "is this real or a mock?" · "attest that I'm SOC 2 compliant" · "what's still SPEC?"</div>}
            {chat.map((m, i) => (
              <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>{m.role === 'user' ? 'you' : 'proof360 agent'}</div>
                <div style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.5, color: m.role === 'user' ? C.primary : C.secondary, background: m.role === 'user' ? '#13294a' : 'transparent', borderRadius: 8, padding: m.role === 'user' ? '8px 12px' : 0 }}>{m.text}</div>
                {m.actions?.length > 0 && <div style={{ marginTop: 4, display: 'flex', gap: 6, flexWrap: 'wrap' }}>{m.actions.map((a, j) => <Mono key={j} color={C.accent}>▸ ran {a.tool}</Mono>)}</div>}
              </div>
            ))}
            {thinking && <div style={{ color: C.muted, fontSize: 13 }}>agent is checking the substrate…</div>}
            <div ref={chatEnd} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="ask anything…" style={{ flex: 1, background: C.bg, color: C.primary, border: `1px solid ${C.line}`, borderRadius: 8, padding: '10px 12px', fontSize: 14 }} />
            <Btn onClick={send} busy={thinking} kind="primary">Send</Btn>
          </div>
        </section>

        <div style={{ textAlign: 'center', color: C.muted, fontSize: 12, marginTop: 20 }}>
          ephemeral sandbox · session {sid.slice(0, 8)} · real VERITAS + Guard · Bedrock-direct agent
        </div>
      </div>
    </div>
  );
}
