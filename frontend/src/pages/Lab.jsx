import { Fragment, useEffect, useRef, useState } from 'react';
import { useCer } from '../hooks/useCer.js';
import { PATHWAYS } from '../utils/cerPathways.js';
import { CerAgencyCard } from '../components/chat/CerAgencyCard.jsx';
import { tokens } from '../tokens.js';

// proof360 — the accumulating "lab" home (Hive & Co reference founder).
// ADDITIVE FIRST CUT (design/hiveandco-lab): a real routed surface at /lab, folded from
// prototypes/hiveandco-lab.html. Chosen approach — build the lab as its own component now
// (non-colliding, verifiable), then mount it as the /chat home in a later deliberate step.
//
// Logos: dark-safe currentColor glyphs, NOT the OperationalField/logos/* wordmarks — those
// carry a baked dark fill (#181818) built for the light pearl/paper/study themes and would be
// near-invisible on this honey ground. A light-on-dark official-asset swap is a separate task.
//
// Moves: each is a CER. A Move with a `route` calls the LIVE CER spine (useCer.startRoute →
// CerAgencyCard consent review → confirmCer → POST /api/v1/profile/current/cers). Persisting a
// CER grants consent server-side, so the click alone NEVER creates it — the same agency/consent
// card the chat flow uses docks under the Move first (CER-CONSENT-GATES-001). ONLY the
// DEMO_FOUNDER build persists (tokenless, demo profile); a non-demo build never writes this
// reference lab's Moves to a real founder's record — it points at starting their own lab.
// The external next-step (external_action on the pathway — "extend CER") is revealed once the
// record exists; the handler that fires it lives in the /chat fold (CerProjectionCard onBookCall
// is a no-op today — the one real remaining build).

// --- dark-safe brand glyphs (currentColor; brand colour only on hover via --bc) -------------
const G = {
  claude: (
    <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" fill="none">
      <line x1="12" y1="3" x2="12" y2="21" /><line x1="4.2" y1="7.5" x2="19.8" y2="16.5" /><line x1="19.8" y1="7.5" x2="4.2" y2="16.5" />
    </svg>
  ),
  bedrock: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M4 14c4.5 3.2 11.5 3.2 16 0" /><path d="M15.5 12.5 20 14l-1.4 4.3" />
    </svg>
  ),
  perplexity: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="8.5" /><path d="M12 3.5v17M3.5 12h17" strokeWidth="1.4" />
    </svg>
  ),
  cloudflare: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M6.2 17.5a3.8 3.8 0 0 1 .5-7.55 5.4 5.4 0 0 1 10.2 1.15 3.3 3.3 0 0 1 1.4 6.4z" />
    </svg>
  ),
  vanta: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" /><path d="M9 12l2 2 4-4" strokeWidth="1.7" />
    </svg>
  ),
  cisco: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <rect x="3" y="10" width="2" height="4" rx="1" /><rect x="7.5" y="7" width="2" height="10" rx="1" />
      <rect x="12" y="4" width="2" height="16" rx="1" /><rect x="16.5" y="7" width="2" height="10" rx="1" />
    </svg>
  ),
  cyberpro: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
    </svg>
  ),
};

// --- the Moves — each maps to a live CER pathway (or is a free readiness action) ------------
const MOVES = [
  {
    key: 'free', tag: 'Free · $0', tagClass: 'free', route: null,
    title: 'Publish an incident-response policy',
    why: <>Clears the first enterprise checklist item and lifts readiness <b>+3</b> — no vendor spend. The template’s already written.</>,
    cta: 'Use the template', done: 'Template opened',
  },
  {
    key: 'aws', tag: 'Apply', tagClass: 'apply', route: 'ingram_micro_aws', mark: G.bedrock, externalGap: 'aws_activate_application',
    title: 'AWS Activate — $10k in credits',
    why: <>The application is <b>pre-filled from your posture</b>. Under review in one click; credits land on EC2, S3 and RDS on approval.</>,
    cta: 'Apply', done: 'AWS pathway open',
  },
  {
    key: 'vanta', tag: 'AWS Marketplace', tagClass: 'buy', hot: true, route: 'vanta', mark: G.vanta, ctaClass: 'solid',
    title: 'Close SOC 2 with Vanta',
    why: <>Buy it <b>through AWS Marketplace</b> — it draws down your AWS commitment, and Ingram is seller-of-record. One private offer, your posture attached.</>,
    cta: 'Start the offer', done: 'Offer started',
  },
  {
    key: 'cyber', tag: 'When you’re ready', tagClass: 'when', route: 'austbrokers_cyberpro',
    title: 'Cyber cover — CyberPro',
    why: <>A quote, not a commitment. Your posture <em>is</em> the application. It sits here quietly — engage it the day a deal needs it, not before.</>,
    cta: 'Get covered', done: 'Cover requested',
  },
];

// The consent card renders on the chat's pearl tokens DELIBERATELY: it is the same
// agency/consent component the chat flow mounts — a paper record-moment on the honey
// ground — not a lab-styled variant that could drift from the real consent step.
const CONSENT_TK = tokens('pearl');

function Brand({ bc, glyph, children }) {
  return (
    <a className="brand" style={bc ? { '--bc': bc } : undefined} href="#!">
      {glyph}{children}
    </a>
  );
}

export default function Lab() {
  const hexRef = useRef(null);
  const cer = useCer({ companyName: 'Hive & Co', enabled: true });
  const [running, setRunning] = useState(null);   // route currently in consent review
  const [opened, setOpened] = useState({});        // move key -> true once run this visit
  const [notice, setNotice] = useState(null);      // 'signin' | 'reference'

  // Faint honeycomb ground — atmosphere, not decoration (ported from the prototype canvas).
  useEffect(() => {
    const c = hexRef.current;
    if (!c) return;
    const x = c.getContext('2d');
    if (!x) return; // non-canvas environments (jsdom) — atmosphere only, never load-bearing
    const hex = (cx, cy, r) => {
      x.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 180) * (60 * i - 30);
        const px = cx + r * Math.cos(a), py = cy + r * Math.sin(a);
        i ? x.lineTo(px, py) : x.moveTo(px, py);
      }
      x.closePath(); x.stroke();
    };
    const draw = () => {
      const w = c.width = window.innerWidth, h = c.height = window.innerHeight, r = 34;
      const hw = Math.sqrt(3) * r, vh = 1.5 * r;
      x.clearRect(0, 0, w, h);
      x.strokeStyle = 'rgba(230,169,74,0.05)'; x.lineWidth = 1;
      for (let row = -1, ry = 0; ry < h + vh; row++, ry = row * vh) {
        for (let cx = (row % 2 ? hw / 2 : 0) - hw; cx < w + hw; cx += hw) hex(x, cx, ry, r);
      }
    };
    draw();
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  }, []);

  // Move click → start the (confirmed) route. Persisting is NOT automatic: the agency/consent
  // card docks under the Move and only its explicit Confirm (consent checkbox ticked) calls
  // confirmCer. Persisting a CER grants consent server-side, so a one-click Move must never
  // create a partner-shareable Decision on its own (CER-CONSENT-GATES-001).
  //
  // Trust boundary: this is Hive & Co's REFERENCE lab. Only the demo founder build persists
  // Moves — in a real (non-demo) build a signed-in founder must never accrue Hive-framed CERs
  // on their own record from here; they get pointed at starting their own lab instead.
  const runMove = (m) => {
    if (!m.route) { setOpened((o) => ({ ...o, [m.key]: true })); return; }
    if (running || opened[m.key]) return;
    if (import.meta.env.VITE_DEMO_FOUNDER_MODE !== 'true') { setNotice('reference'); return; }
    setNotice(null);
    setRunning(m.route);
    cer.startRoute(m.route);
  };

  const cancelMove = () => {
    cer.dismissForming();
    setRunning(null);
  };

  const confirmMove = async (m) => {
    try {
      const created = await cer.confirmCer();
      if (created) setOpened((o) => ({ ...o, [m.key]: true }));
      else setNotice('signin');
    } catch {
      setNotice('signin');
    } finally {
      setRunning(null);
    }
  };

  const moveState = (m) => {
    // A route with a live (non-withdrawn) CER on record counts as run — survives reload,
    // prevents a second confirmation posting a duplicate Decision.
    const onRecord = m.route && cer.createdCers.some((c) => c.route === m.route && c.consent_state !== 'withdrawn');
    if (onRecord || opened[m.key]) return { label: m.done, done: true };
    if (m.route && running === m.route) return { label: 'Reviewing…', busy: true };
    return { label: m.cta, done: false };
  };

  return (
    <div className="p360lab-root">
      <style>{LAB_CSS}</style>
      <canvas id="hexbg" ref={hexRef} />
      <div className="wrap">
        <div className="topbar">
          <div className="mark"><b>proof</b><i>360</i></div>
          <div className="who">
            <a className="supbtn" href="/account/login">Start your own lab →</a>
            <span className="pill">● Hive &amp; Co</span>
            <span className="ava">H</span>
          </div>
        </div>

        <div className="shell">
          <div className="eyebrow">Trust &amp; Readiness Lab</div>
          <h1 className="hero">Welcome back to <i>Hive &amp; Co’s</i> lab.</h1>

          <div className="resume">
            <span className="dot" />
            <p>Your lab on <b>Hive &amp; Co</b>: 12 reads, 6 vendors matched, readiness <b>38 → 41</b>.
              <span className="chg"> 2 new signals since Tuesday — a fresh healthcare-buyer search and Cloudflare confirmed live on your domain.</span> Pick up where you left off.</p>
          </div>

          <div className="trustbar">
            <span className="tcap">Runs live on</span>
            <Brand bc="#d97757" glyph={G.claude}>Claude</Brand>
            <Brand bc="#ff9900" glyph={G.bedrock}>Bedrock</Brand>
            <Brand bc="#20b8cd" glyph={G.perplexity}>Perplexity</Brand>
            <Brand bc="#f38020" glyph={G.cloudflare}>Cloudflare</Brand>
            <span className="sep">·</span>
            <Brand bc="#6d5efc" glyph={G.vanta}>Vanta</Brand>
            <Brand bc="#049fd9" glyph={G.cisco}>Cisco</Brand>
          </div>

          <div className="cards">
            <div className="card readcard">
              <div className="clabel">Investor Readiness</div>
              <div className="ring">
                <svg width="66" height="66" viewBox="0 0 66 66" aria-hidden="true">
                  <circle cx="33" cy="33" r="28" fill="none" stroke="#3a2c22" strokeWidth="6" />
                  <circle cx="33" cy="33" r="28" fill="none" stroke="#e6a94a" strokeWidth="6" strokeLinecap="round" strokeDasharray="175.9" strokeDashoffset="103.8" transform="rotate(-90 33 33)" />
                </svg>
                <div className="ringnum">41<small>&thinsp;/100</small></div>
              </div>
              <div className="csub"><span className="delta">▲ +26</span> since first read</div>
              <a className="clink" href="/journey">See the projection →</a>
            </div>

            <div className="card">
              <div className="clabel">Vendors Matched</div>
              <div className="cbig">6</div>
              <div className="csub">Vanta, AWS, Cloudflare, Microsoft, Cisco …</div>
              <a className="clink" href="#!">View matches →</a>
            </div>

            <div className="card">
              <div className="clabel">Programs</div>
              <div className="cbig">8</div>
              <div className="csub"><b style={{ color: 'var(--cream)' }}>$231k</b> in credits mapped</div>
              <a className="clink" href="#!">View programs →</a>
            </div>

            <div className="card latest">
              <div className="clabel">Latest Read</div>
              <div className="csub">hiveandco.au — the raise docs are clean; the evidence layer is the gap.</div>
              <a className="clink" href="#!">Open the read →</a>
            </div>
          </div>

          <div className="moves">
            <div className="moveshead">
              <h3>Moves you can run today.</h3>
              <p>Each is a Decision you control — pre-filled from your posture, yours to withdraw.</p>
            </div>
            <div className="movelist">
              {MOVES.map((m) => {
                const st = moveState(m);
                const pathway = m.route ? PATHWAYS[m.route] : null;
                const reviewing = m.route && running === m.route
                  && cer.forming?.route === m.route && cer.agencyReady && cer.proposal;
                return (
                  <Fragment key={m.key}>
                    <div className={`move${m.hot ? ' hot' : ''}`} data-cer-route={m.route || 'none'}>
                      <div className={`mtag ${m.tagClass}`}>{m.tag}</div>
                      <div>
                        <p className="mtitle">{m.mark ? <span className="movemark">{m.mark}</span> : null}{m.title}</p>
                        <p className="mwhy">{m.why}</p>
                        {pathway && st.done ? <p className="mnext">Pathway open · <a href="#!">{pathway.partner} — next step →</a></p> : null}
                      </div>
                      <button
                        className={`mcta${m.ctaClass ? ' ' + m.ctaClass : ''}`}
                        disabled={st.busy || st.done}
                        onClick={() => runMove(m)}
                      >
                        {st.label}{st.done ? ' ✓' : ' →'}
                      </button>
                    </div>
                    {reviewing ? (
                      <div className="consentdock">
                        <CerAgencyCard
                          proposal={cer.proposal}
                          tk={CONSENT_TK}
                          busy={cer.busy}
                          onEdit={cancelMove}
                          onConfirm={() => confirmMove(m)}
                        />
                      </div>
                    ) : null}
                  </Fragment>
                );
              })}
            </div>
            {notice === 'reference' ? <p className="signin">This is Hive &amp; Co&rsquo;s reference lab — Moves here are a walkthrough, not your record. <a href="/account/login">Start your own lab →</a></p> : null}
            {notice === 'signin' ? <p className="signin">Sign in to run a Move — it becomes a Decision on your record. <a href="/account/login">Sign in →</a></p> : null}
          </div>

          <div className="ask">
            <div>
              <h2>Ask Hive &amp; Co’s posture a question.</h2>
              <p>The lab reads live signals, maps the buyer, and hands you moves you can run today — not a report you file.</p>
              <span className="try"><b>Try</b> What would a Series A investor’s DD flag first?</span>
            </div>
            <a className="newrun" href="/chat">+ New run</a>
          </div>

          <div className="histhead">
            <h2>What you’ve uncovered so far</h2>
            <span className="meta">12 reads · newest first</span>
          </div>

          <div className="hist">
            <div className="item">
              <p className="q">What would a Series A investor’s DD flag first — and what closes it?</p>
              <p className="found">The provenance chain. Your raise docs are open and clean, but there’s no attested trail from supplier to jar. Fix that before term-sheet stage; it’s the difference between “start a conversation” and “close.”</p>
              <div className="imeta"><span className="lens sophia">● Sophia · investor/trust</span><span>4 Jul 2026, 4:05 pm</span><span className="newr">▲ readiness +3</span><span className="fresh">new</span></div>
            </div>
            <div className="item">
              <p className="q">Which of my three gaps loses a deal fastest?</p>
              <p className="found">No SOC 2. Healthcare enterprise procurement gates on it — it stalls the deal before price. An IR policy this week (free Vanta template) clears one checklist item with zero vendor spend.</p>
              <div className="imeta"><span className="lens edison">● Edison · operational</span><span>4 Jul 2026, 11:20 am</span><span>1 read</span></div>
            </div>
            <div className="item">
              <p className="q">hiveandco.au — cold read</p>
              <p className="found">The read that opened this lab. Founded 2019, Manuka provenance play, Sainsbury’s enterprise pilot. Journey → signals → gaps, 6 live sources. This is the seed every card above grew from.</p>
              <div className="imeta"><span className="seed">● seed read</span><span>3 Jul 2026, 9:12 pm</span><span>3 reads</span></div>
            </div>
          </div>

          <div className="rails">
            <div className="railrow">
              <span className="railcap">Sensed live via</span>
              <Brand bc="#20b8cd" glyph={G.perplexity}>Perplexity</Brand>
              <Brand bc="#f38020" glyph={G.cloudflare}>Cloudflare</Brand>
              <Brand>GitHub</Brand>
              <span className="brand">WHOIS</span>
            </div>
            <div className="railrow">
              <span className="railcap">Reasoned on</span>
              <Brand bc="#d97757" glyph={G.claude}>Claude</Brand>
              <Brand bc="#ff9900" glyph={G.bedrock}>Bedrock</Brand>
            </div>
            <div className="railrow">
              <span className="railcap">Engagements route through</span>
              <Brand bc="#ff9900" glyph={G.bedrock}>AWS Marketplace</Brand>
              <Brand bc="#2b6cb0">Ingram</Brand>
              <Brand bc="#6d5efc" glyph={G.vanta}>Vanta</Brand>
              <Brand bc="#049fd9" glyph={G.cisco}>Cisco</Brand>
              <Brand bc="#3fb0c9" glyph={G.cyberpro}>CyberPro</Brand>
            </div>
          </div>

          <div className="foot">
            <span>This is Hive &amp; Co’s lab — a reference founder. Map your own against it. · proof360.au</span>
            <span className="live">Every logo above is a <b>live rail, not a badge</b> · each one checkable</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Honey-provenance palette, scoped under .p360lab-root so it never leaks into the pearl/paper/
// study themes. Promoting "honey" to a 4th global token theme is a deliberate follow-up.
const LAB_CSS = `
.p360lab-root{
  --ground:#201712; --comb:#2b2019; --combLo:#342519; --combHi:#3b2b1e;
  --honey:#e6a94a; --amber:#c17d30; --cream:#f3ebdd; --tan:#ad9d86;
  --hair:#3a2c22; --hairHi:#4a382a; --sealed:#6bb388; --rail:#5aa1a1; --warn:#d98a3d;
  --serif:"Hoefler Text","Iowan Old Style",Garamond,Georgia,"Times New Roman",serif;
  --mono:"SFMono-Regular","SF Mono","Space Mono",Menlo,Consolas,monospace;
  min-height:100vh;position:relative;
}
.p360lab-root *{box-sizing:border-box}
.p360lab-root #hexbg{position:fixed;inset:0;z-index:0;pointer-events:none;opacity:.5}
.p360lab-root .wrap{position:relative;z-index:1;background:
    radial-gradient(1200px 620px at 78% -8%, rgba(230,169,74,.10), transparent 60%),
    radial-gradient(900px 500px at 6% 4%, rgba(90,161,161,.05), transparent 55%),
    var(--ground);
  color:var(--cream);font-family:var(--serif);min-height:100vh;
  -webkit-font-smoothing:antialiased;line-height:1.5}
.p360lab-root .shell{max-width:1120px;margin:0 auto;padding:0 32px 96px}
.p360lab-root .topbar{display:flex;align-items:center;justify-content:space-between;padding:26px 32px;max-width:1120px;margin:0 auto}
.p360lab-root .mark{font-family:var(--serif);font-size:26px;font-weight:600;letter-spacing:-.01em}
.p360lab-root .mark b{color:var(--cream)} .p360lab-root .mark i{font-style:italic;color:var(--honey);font-weight:600}
.p360lab-root .who{display:flex;align-items:center;gap:12px}
.p360lab-root .pill{font-family:var(--mono);font-size:12px;letter-spacing:.04em;color:var(--honey);border:1px solid var(--hairHi);border-radius:999px;padding:7px 14px;background:rgba(230,169,74,.06)}
.p360lab-root .ava{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(150deg,var(--honey),var(--amber));color:#241a10;font-family:var(--mono);font-weight:700;font-size:14px}
.p360lab-root .supbtn{font-family:var(--mono);font-size:12.5px;color:#241a10;background:var(--cream);border-radius:9px;padding:9px 15px;text-decoration:none;font-weight:600;white-space:nowrap}
.p360lab-root .supbtn:hover{background:var(--honey)}
.p360lab-root .eyebrow{font-family:var(--mono);font-size:12px;letter-spacing:.34em;color:var(--tan);text-transform:uppercase;margin:34px 0 14px}
.p360lab-root h1.hero{font-size:clamp(38px,5.4vw,68px);line-height:1.02;font-weight:600;letter-spacing:-.02em;margin:0 0 8px;text-wrap:balance;max-width:15ch}
.p360lab-root h1.hero i{font-style:italic;color:var(--honey)}
.p360lab-root .resume{display:flex;gap:16px;align-items:flex-start;margin:30px 0 8px;border:1px solid var(--hair);border-radius:16px;padding:20px 22px;background:linear-gradient(180deg,rgba(255,255,255,.02),transparent)}
.p360lab-root .dot{width:9px;height:9px;border-radius:50%;background:var(--sealed);margin-top:7px;flex:0 0 auto;box-shadow:0 0 0 4px rgba(107,179,136,.14)}
.p360lab-root .resume p{margin:0;font-size:18px;color:var(--cream);max-width:70ch}
.p360lab-root .resume p b{color:var(--honey);font-weight:600}
.p360lab-root .resume .chg{color:var(--sealed);font-style:italic}
.p360lab-root .trustbar{display:flex;align-items:center;gap:14px 22px;flex-wrap:wrap;margin:20px 0 6px}
.p360lab-root .trustbar .tcap{font-family:var(--mono);font-size:10.5px;letter-spacing:.15em;text-transform:uppercase;color:var(--tan);opacity:.75}
.p360lab-root .trustbar .brand{opacity:.9;font-size:13.5px}
.p360lab-root .trustbar .brand svg{width:21px;height:21px}
.p360lab-root .trustbar .sep{color:var(--hairHi);font-size:14px}
.p360lab-root .brand{display:inline-flex;align-items:center;gap:8px;color:var(--tan);opacity:.8;font-family:var(--mono);font-size:12.5px;letter-spacing:.01em;text-decoration:none;transition:opacity .2s,color .2s}
.p360lab-root .brand:hover{opacity:1;color:var(--bc,var(--cream))}
.p360lab-root .brand svg{width:17px;height:17px;flex:0 0 auto}
.p360lab-root .cards{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin:22px 0}
.p360lab-root .card{border:1px solid var(--hair);border-radius:16px;padding:20px;background:var(--comb);display:flex;flex-direction:column;gap:6px;min-height:186px;position:relative;transition:border-color .18s,transform .18s}
.p360lab-root .card:hover{border-color:var(--hairHi);transform:translateY(-2px)}
.p360lab-root .clabel{font-family:var(--mono);font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--tan)}
.p360lab-root .cbig{font-family:var(--serif);font-size:52px;line-height:1;font-weight:600;font-variant-numeric:tabular-nums;margin-top:4px}
.p360lab-root .csub{font-size:14px;color:var(--tan);margin-top:auto}
.p360lab-root .clink{font-family:var(--mono);font-size:13px;color:var(--honey);text-decoration:none;margin-top:10px;display:inline-flex;gap:6px}
.p360lab-root .clink:hover{color:var(--cream)}
.p360lab-root .delta{color:var(--sealed);font-family:var(--mono);font-size:12px}
.p360lab-root .ring{display:flex;align-items:center;gap:16px;margin-top:2px}
.p360lab-root .ring svg{flex:0 0 auto}
.p360lab-root .ringnum{font-family:var(--serif);font-size:40px;font-weight:600;line-height:1;font-variant-numeric:tabular-nums}
.p360lab-root .ringnum small{font-size:15px;color:var(--tan);font-family:var(--mono)}
.p360lab-root .readcard{background:linear-gradient(180deg,rgba(230,169,74,.10),var(--comb));border-color:var(--hairHi)}
.p360lab-root .latest .csub{color:var(--cream);font-size:15px;line-height:1.35;margin-top:6px;font-family:var(--serif)}
.p360lab-root .moves{margin:30px 0 4px;border-top:1px solid var(--hair);padding-top:26px}
.p360lab-root .moveshead{display:flex;justify-content:space-between;align-items:baseline;gap:16px;flex-wrap:wrap;margin-bottom:16px}
.p360lab-root .moveshead h3{font-family:var(--serif);font-size:26px;font-weight:600;margin:0;letter-spacing:-.01em}
.p360lab-root .moveshead p{margin:0;font-size:13px;color:var(--tan);font-style:italic;max-width:46ch}
.p360lab-root .movelist{display:flex;flex-direction:column;gap:12px}
.p360lab-root .move{display:grid;grid-template-columns:132px 1fr auto;gap:20px;align-items:center;border:1px solid var(--hair);border-radius:14px;padding:18px 20px;background:var(--comb)}
.p360lab-root .move.hot{background:linear-gradient(120deg,rgba(230,169,74,.12),var(--comb) 62%);border-color:var(--hairHi)}
.p360lab-root .mtag{font-family:var(--mono);font-size:10.5px;letter-spacing:.09em;text-transform:uppercase;padding:6px 10px;border-radius:7px;border:1px solid var(--hairHi);text-align:center;color:var(--tan);align-self:start}
.p360lab-root .mtag.free{color:var(--sealed);border-color:rgba(107,179,136,.4);background:rgba(107,179,136,.07)}
.p360lab-root .mtag.apply{color:var(--rail);border-color:rgba(90,161,161,.4);background:rgba(90,161,161,.07)}
.p360lab-root .mtag.buy{color:var(--honey);border-color:rgba(230,169,74,.45);background:rgba(230,169,74,.09)}
.p360lab-root .mtag.when{color:var(--tan)}
.p360lab-root .mtitle{font-family:var(--serif);font-size:19px;color:var(--cream);margin:0 0 5px;line-height:1.25}
.p360lab-root .movemark{display:inline-flex;vertical-align:-3px;margin-right:8px;opacity:.55;color:var(--tan)}
.p360lab-root .movemark svg{width:17px;height:17px}
.p360lab-root .mwhy{margin:0;font-size:14px;color:var(--tan);line-height:1.45;max-width:64ch}
.p360lab-root .mwhy b{color:var(--cream);font-weight:400}
.p360lab-root .mnext{margin:8px 0 0;font-family:var(--mono);font-size:12px;color:var(--sealed)}
.p360lab-root .mnext a{color:var(--honey);text-decoration:none}
.p360lab-root .mcta{font-family:var(--mono);font-size:13px;white-space:nowrap;text-decoration:none;padding:11px 16px;border-radius:10px;border:1px solid var(--hairHi);color:var(--cream);background:transparent;cursor:pointer;transition:border-color .15s,color .15s}
.p360lab-root .mcta:hover:not(:disabled){border-color:var(--honey);color:var(--honey)}
.p360lab-root .mcta:disabled{cursor:default;opacity:.85}
.p360lab-root .mcta.solid{background:linear-gradient(160deg,var(--honey),var(--amber));color:#241a10;border:none;font-weight:700;box-shadow:0 6px 20px -8px rgba(230,169,74,.55)}
.p360lab-root .mcta.solid:hover:not(:disabled){filter:brightness(1.06);color:#241a10}
.p360lab-root .consentdock{display:flex;justify-content:center;padding:8px 0 4px}
.p360lab-root .signin{margin:14px 2px 0;font-size:14px;color:var(--warn)}
.p360lab-root .signin a{color:var(--honey)}
.p360lab-root .ask{margin:30px 0;border:1px solid var(--hairHi);border-radius:18px;padding:28px 30px;background:linear-gradient(135deg,rgba(230,169,74,.13),rgba(193,125,48,.05) 60%,transparent);display:flex;align-items:center;justify-content:space-between;gap:24px;flex-wrap:wrap}
.p360lab-root .ask h2{font-family:var(--serif);font-size:27px;font-weight:600;margin:0 0 8px;letter-spacing:-.01em}
.p360lab-root .ask p{margin:0;color:var(--tan);font-size:15px;max-width:56ch}
.p360lab-root .try{display:inline-flex;align-items:center;gap:10px;margin-top:16px;border:1px dashed var(--hairHi);border-radius:10px;padding:10px 14px;color:var(--cream);font-size:14px;font-style:italic}
.p360lab-root .try b{font-family:var(--mono);font-style:normal;font-size:11px;letter-spacing:.1em;color:var(--honey)}
.p360lab-root .newrun{font-family:var(--mono);font-size:15px;font-weight:700;letter-spacing:.01em;color:#241a10;background:linear-gradient(160deg,var(--honey),var(--amber));border:none;border-radius:12px;padding:16px 26px;cursor:pointer;white-space:nowrap;text-decoration:none;box-shadow:0 8px 26px -10px rgba(230,169,74,.6)}
.p360lab-root .newrun:hover{filter:brightness(1.06)}
.p360lab-root .histhead{display:flex;align-items:baseline;gap:14px;margin:40px 0 16px}
.p360lab-root .histhead h2{font-family:var(--serif);font-size:30px;font-weight:600;margin:0;letter-spacing:-.01em}
.p360lab-root .histhead .meta{font-family:var(--mono);font-size:12px;color:var(--tan);letter-spacing:.05em}
.p360lab-root .hist{display:flex;flex-direction:column;gap:12px}
.p360lab-root .item{border:1px solid var(--hair);border-radius:14px;padding:18px 22px;background:var(--comb);transition:border-color .18s,background .18s;cursor:pointer}
.p360lab-root .item:hover{border-color:var(--hairHi);background:var(--combLo)}
.p360lab-root .item .q{font-size:19px;color:var(--cream);margin:0 0 8px;line-height:1.3}
.p360lab-root .item .found{font-size:14px;color:var(--tan);margin:0 0 10px;max-width:80ch;line-height:1.45}
.p360lab-root .item .imeta{font-family:var(--mono);font-size:11.5px;color:var(--tan);letter-spacing:.04em;display:flex;gap:14px;flex-wrap:wrap;align-items:center}
.p360lab-root .lens{padding:2px 8px;border-radius:5px;border:1px solid var(--hairHi)}
.p360lab-root .lens.sophia{color:var(--honey)} .p360lab-root .lens.edison{color:var(--rail)}
.p360lab-root .seed{color:var(--sealed)} .p360lab-root .newr{color:var(--honey)}
.p360lab-root .fresh{font-family:var(--mono);font-size:10px;letter-spacing:.08em;color:#241a10;background:var(--honey);padding:2px 7px;border-radius:5px;text-transform:uppercase}
.p360lab-root .rails{margin:38px 0 0;border-top:1px solid var(--hair);padding-top:26px;display:flex;flex-direction:column;gap:16px}
.p360lab-root .railrow{display:flex;align-items:center;gap:14px 20px;flex-wrap:wrap}
.p360lab-root .railcap{font-family:var(--mono);font-size:10.5px;letter-spacing:.15em;text-transform:uppercase;color:var(--tan);opacity:.6;flex:0 0 176px}
.p360lab-root .foot{margin-top:40px;padding-top:22px;border-top:1px solid var(--hair);display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap;font-family:var(--mono);font-size:12px;color:var(--tan);letter-spacing:.03em}
.p360lab-root .foot .live{color:var(--tan)} .p360lab-root .foot .live b{color:var(--sealed);font-weight:400}
@media(max-width:860px){.p360lab-root .cards{grid-template-columns:repeat(2,1fr)}.p360lab-root .shell{padding:0 20px 72px}.p360lab-root .topbar{padding:20px}}
@media(max-width:640px){.p360lab-root .railcap{flex-basis:100%}.p360lab-root .move{grid-template-columns:1fr;gap:12px}.p360lab-root .mcta{justify-self:start}}
@media(max-width:520px){.p360lab-root .cards{grid-template-columns:1fr}.p360lab-root .ask{flex-direction:column;align-items:flex-start}}
@media(prefers-reduced-motion:reduce){.p360lab-root *{transition:none!important}}
`;
