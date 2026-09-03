import { Fragment, useEffect, useMemo, useState } from 'react';
import { getJourney } from '../api/client';
import { derivePresence, LEVEL_LABEL, SPACES } from '../utils/journeyPresence.js';

// ---------- derive presence from the atom-spine claims ----------
// Presence replaces posture (workshop 2026-09-03): deriveArc() — BASE 52, gap −9, match +5,
// outcome +13 — was a score by another name and every chapter carried a "posture ↑ n" chip.
// The record now shows which of the six rooms the founder has walked into, per chapter.
// See src/utils/journeyPresence.js.
function classifyClaim(c) {
  const s = (c.subject || '').toLowerCase();
  if (c.authority === 'reality') return 'outcome';
  if (s.startsWith('gap:')) return 'gap';
  if (s.startsWith('match:')) return 'match';
  return 'signal';
}
function countKinds(entries) {
  let gaps = 0, outcomes = 0;
  for (const e of entries) for (const c of e.claims) {
    const k = classifyClaim(c);
    if (k === 'gap') gaps++;
    if (k === 'outcome') outcomes++;
  }
  return { gaps, outcomes };
}

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const fmtMonthYear = (iso) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });

const KIND_META = {
  gap:     { dot: '◆', tag: 'Gap surfaced',     cls: 'k-gap' },
  match:   { dot: '◈', tag: 'Vendor matched',   cls: 'k-match' },
  outcome: { dot: '●', tag: 'Verified outcome', cls: 'k-outcome' },
  signal:  { dot: '○', tag: 'Signal',           cls: 'k-signal' },
};
const AUTHORITY_LABEL = {
  reality: 'verified in reality',
  founder: 'founder-stated',
  cto: 'CTO-stated',
  legal: 'legal-stated',
  provider: 'provider-attested',
  system: 'system-derived',
  operator: 'operator-noted',
};

export default function Journey() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { getJourney().then(setData).catch((e) => setError(String(e))); }, []);
  useEffect(() => { if (data) requestAnimationFrame(() => setMounted(true)); }, [data]);

  const presence = useMemo(() => derivePresence(data?.entries || []), [data]);
  const kinds = useMemo(() => countKinds(data?.entries || []), [data]);

  // No token = an anonymous visitor, not a fault. Invite them in — never a raw error.
  if (error && /not authenticated/i.test(error))
    return (
      <Shell>
        <div className="jx-state">
          <p className="jx-eyebrow">your journey</p>
          <h2>Sign in to open your trust dossier.</h2>
          <p className="jx-muted">Your journey is private — it renders from your own record, for your eyes.</p>
          <a className="jx-cta" href="/account/login">Sign in →</a>
        </div>
      </Shell>
    );
  if (error)
    return (
      <Shell>
        <div className="jx-state">
          <p className="jx-eyebrow">unreachable</p>
          <h2>We couldn’t open your journey.</h2>
          <code className="jx-err">{error}</code>
        </div>
      </Shell>
    );
  if (!data)
    return (
      <Shell>
        <div className="jx-state"><div className="jx-pulse" /><p className="jx-muted">Opening your trust dossier…</p></div>
      </Shell>
    );
  if (!data.entries?.length)
    return (
      <Shell>
        <div className="jx-state">
          <p className="jx-eyebrow">no chapters yet</p>
          <h2>Your journey starts at your first read.</h2>
          <p className="jx-muted">The moment proof360 cold-reads your company, this page begins keeping your record.</p>
        </div>
      </Shell>
    );

  const company = data.company?.name || 'Your company';
  const first = data.entries[0].occurred_at;
  const last = data.entries[data.entries.length - 1].occurred_at;
  return (
    <Shell>
      <header className="jx-head">
        <p className="jx-eyebrow">proof360 · trust dossier</p>
        <h1 className="jx-title">
          <span className="jx-title-co">{company}</span>
          <span className="jx-title-sub">— a trust journey, kept</span>
        </h1>
        <p className="jx-dek">
          Every line below is a governed claim with a known source. This is your living record:
          where you were, what moved, and where you stand now.
        </p>

        <div className="jx-stats">
          <Stat k={`${presence.open} of ${SPACES.length}`} l="rooms open" accent="pos" />
          <Stat k={String(kinds.gaps)} l={kinds.gaps === 1 ? 'gap surfaced' : 'gaps surfaced'} />
          <Stat k={String(kinds.outcomes)} l={kinds.outcomes === 1 ? 'verified outcome' : 'verified outcomes'} accent="pos" />
          <Stat k={String(data.entries.length)} l={data.entries.length === 1 ? 'chapter' : 'chapters'} />
          <Stat k={`${fmtMonthYear(first)} → ${fmtMonthYear(last)}`} l="span" wide />
        </div>
      </header>

      <section className="jx-presence" aria-label="What is present, by chapter">
        <div className="jx-chart-label"><span>what is present · by chapter</span><span>now</span></div>
        <div className="jx-presence-grid" style={{ '--chapters': data.entries.length }}>
          <span />
          {data.entries.map((e, i) => (
            <span key={e.session_id} className="jx-presence-head">ch.{String(i + 1).padStart(2, '0')}</span>
          ))}
          {presence.rows.map((row) => (
            <Fragment key={row.id}>
              <span className="jx-presence-room">{row.label}</span>
              {row.cells.map((level, i) => (
                <span key={i} className="jx-presence-cell" title={`${row.label} · ch.${i + 1} · ${LEVEL_LABEL[level]}`}>
                  <span className={`jx-pip l${level} ${mounted ? 'in' : ''}`} style={{ '--d': `${300 + i * 120}ms` }} />
                </span>
              ))}
            </Fragment>
          ))}
        </div>
        <div className="jx-presence-legend">
          <span><i className="jx-pip l2" />present</span>
          <span><i className="jx-pip l1" />partial</span>
          <span><i className="jx-pip l0" />not yet — a room you haven’t walked into</span>
        </div>
      </section>

      <section className="jx-time">
        <div className="jx-spine" />
        {data.entries.map((e, i) => {
          const ch = presence.perChapter[i];
          return (
            <article key={e.session_id} className={`jx-moment ${mounted ? 'in' : ''}`} style={{ '--d': `${900 + i * 220}ms` }}>
              <div className="jx-moment-rail">
                <time className="jx-date">{fmtDate(e.occurred_at)}</time>
                <span className="jx-chapno">ch.{String(i + 1).padStart(2, '0')}</span>
              </div>
              <div className="jx-node-mark" />
              <div className="jx-card">
                <div className="jx-card-head">
                  <h3 className="jx-card-title">{e.label || e.session_id}</h3>
                  <RoomsChip open={ch.open} />
                </div>
                <ul className="jx-claims">
                  {e.claims.map((c, j) => {
                    const k = classifyClaim(c);
                    const m = KIND_META[k];
                    return (
                      <li key={j} className={`jx-claim ${m.cls}`}>
                        <span className="jx-claim-dot" aria-hidden>{m.dot}</span>
                        <div className="jx-claim-body">
                          <p className="jx-claim-text">{c.statement}</p>
                          <p className="jx-claim-prov">
                            <span className="jx-tag">{m.tag}</span>
                            <span className="jx-dot-sep">·</span>
                            traced to {AUTHORITY_LABEL[c.authority] || c.authority}
                            {c.confidence ? <><span className="jx-dot-sep">·</span>{c.confidence}</> : null}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </article>
          );
        })}
      </section>

      <footer className="jx-foot">
        <span className="jx-foot-mark">◆◈●</span>
        <p>Every claim traces to governed evidence in proof360. Nothing here is asserted without a source — return any time; your record keeps itself.</p>
      </footer>
    </Shell>
  );
}

function Stat({ k, l, accent, wide }) {
  return (
    <div className={`jx-stat ${wide ? 'wide' : ''} ${accent ? 'a-' + accent : ''}`}>
      <span className="jx-stat-k">{k}</span>
      <span className="jx-stat-l">{l}</span>
    </div>
  );
}

function RoomsChip({ open }) {
  return <span className="jx-pchip rooms">{open} of {SPACES.length} rooms open</span>;
}

function Shell({ children }) {
  return (
    <div className="jx-root">
      <style>{CSS}</style>
      <div className="jx-wrap">{children}</div>
    </div>
  );
}

const CSS = `
.jx-root{
  /* local aliases — all drawn from the master template (tokens.js → :root vars) */
  --ink:var(--p360-ink); --ink-mid:var(--p360-inkMid); --ink-soft:var(--p360-inkSoft);
  --hair:var(--p360-hairline); --hair-strong:var(--p360-hairStrong);
  --surface:var(--p360-surface);
  --accent:var(--p360-plum); --accent-deep:var(--p360-indigo);
  --pos:var(--p360-sevOk); --neg:var(--p360-sevHigh);
  --gap:var(--p360-sevMed); --match:var(--p360-teal); --outcome:var(--p360-sevOk);
  --serif:var(--p360-serif); --sans:var(--p360-sans); --mono:var(--p360-mono);
  position:relative; min-height:100vh;
  background:radial-gradient(120% 80% at 82% -12%, #ffffff 0%, var(--p360-bg) 46%, var(--p360-bgTint) 100%);
  color:var(--ink); font-family:var(--sans); -webkit-font-smoothing:antialiased; overflow-x:hidden;
}
.jx-wrap{position:relative; z-index:1; max-width:920px; margin:0 auto; padding:72px 28px 120px;}

.jx-eyebrow{font-family:var(--mono); font-size:11px; letter-spacing:.32em; text-transform:uppercase; color:var(--accent); margin:0 0 18px;}
.jx-title{margin:0; line-height:.96; font-weight:400; letter-spacing:-.01em;}
.jx-title-co{display:block; font-family:var(--serif); font-size:clamp(46px,8vw,86px); color:var(--ink);}
.jx-title-sub{display:block; font-family:var(--serif); font-style:italic; font-size:clamp(22px,3.4vw,34px); color:var(--ink-mid); margin-top:6px;}
.jx-dek{max-width:46ch; margin:24px 0 0; font-size:16px; line-height:1.55; color:var(--ink-mid);}

.jx-stats{display:flex; flex-wrap:wrap; gap:34px 44px; margin-top:42px; padding-top:30px; border-top:1px solid var(--hair-strong);}
.jx-stat{display:flex; flex-direction:column; gap:6px;}
.jx-stat-k{font-family:var(--serif); font-size:34px; line-height:1; color:var(--ink);}
.jx-stat.wide .jx-stat-k{font-family:var(--mono); font-size:15px; letter-spacing:.02em; padding-top:12px; color:var(--ink-mid);}
.jx-stat-l{font-family:var(--mono); font-size:10.5px; letter-spacing:.22em; text-transform:uppercase; color:var(--ink-soft);}
.jx-stat.a-pos .jx-stat-k{color:var(--pos);} .jx-stat.a-neg .jx-stat-k{color:var(--neg);}

.jx-presence{margin-top:54px; background:var(--surface); border:1px solid var(--hairline); border-radius:4px; padding:14px 16px 16px; box-shadow:0 18px 40px -34px rgba(34,28,46,.5);}
.jx-chart-label{display:flex; justify-content:space-between; font-family:var(--mono); font-size:10px; letter-spacing:.22em; text-transform:uppercase; color:var(--ink-soft); padding:0 10px 12px;}
.jx-presence-grid{display:grid; grid-template-columns:150px repeat(var(--chapters,1),1fr); gap:6px 10px; align-items:center; padding:0 10px;}
.jx-presence-head{font-family:var(--mono); font-size:9.5px; letter-spacing:.14em; text-transform:uppercase; color:var(--ink-soft); text-align:center;}
.jx-presence-room{font-size:12px; color:var(--ink-mid);}
.jx-presence-cell{display:flex; justify-content:center;}
.jx-pip{display:inline-block; width:10px; height:10px; border-radius:50%; box-sizing:border-box;}
.jx-pip.l2{background:var(--accent);} .jx-pip.l1{background:color-mix(in srgb, var(--accent) 40%, transparent);} .jx-pip.l0{border:1px solid var(--hair-strong);}
.jx-presence-cell .jx-pip{opacity:0; transform:scale(.4);} .jx-presence-cell .jx-pip.in{transition:opacity .4s ease var(--d), transform .5s cubic-bezier(.34,1.56,.64,1) var(--d); opacity:1; transform:scale(1);}
.jx-presence-legend{margin-top:14px; padding:0 10px; font-family:var(--mono); font-size:9.5px; letter-spacing:.06em; color:var(--ink-soft); display:flex; gap:18px; flex-wrap:wrap;}
.jx-presence-legend span{display:inline-flex; align-items:center; gap:6px;} .jx-presence-legend .jx-pip{width:8px; height:8px;}

.jx-time{position:relative; margin-top:64px; padding-left:8px;}
.jx-spine{position:absolute; left:148px; top:8px; bottom:40px; width:1px; background:linear-gradient(var(--hair-strong), var(--hair-strong) 70%, transparent);}
.jx-moment{position:relative; display:grid; grid-template-columns:128px 1fr; gap:0 40px; padding:0 0 46px; opacity:0; transform:translateY(18px);}
.jx-moment.in{transition:opacity .7s ease var(--d), transform .7s cubic-bezier(.2,.7,.2,1) var(--d); opacity:1; transform:none;}
.jx-moment-rail{text-align:right; padding-top:4px;}
.jx-date{display:block; font-family:var(--mono); font-size:12px; letter-spacing:.02em; color:var(--ink);}
.jx-chapno{display:block; font-family:var(--mono); font-size:10px; letter-spacing:.2em; text-transform:uppercase; color:var(--ink-soft); margin-top:6px;}
.jx-node-mark{position:absolute; left:144px; top:7px; width:9px; height:9px; border-radius:50%; background:var(--accent); box-shadow:0 0 0 4px var(--p360-bg), 0 0 0 5px var(--hair-strong);}
.jx-card{background:var(--surface); border:1px solid var(--hair); border-radius:5px; padding:22px 24px; box-shadow:0 18px 44px -38px rgba(34,28,46,.55); transition:transform .25s ease, box-shadow .25s ease;}
.jx-card:hover{transform:translateY(-2px); box-shadow:0 26px 50px -34px rgba(34,28,46,.5);}
.jx-card-head{display:flex; align-items:baseline; justify-content:space-between; gap:16px; flex-wrap:wrap;}
.jx-card-title{margin:0; font-family:var(--serif); font-size:27px; font-weight:400; line-height:1.1; color:var(--ink);}
.jx-pchip{font-family:var(--mono); font-size:10.5px; letter-spacing:.08em; padding:4px 9px; border-radius:20px; white-space:nowrap;}
.jx-claims{list-style:none; margin:20px 0 0; padding:0; display:flex; flex-direction:column;}
.jx-claim{display:grid; grid-template-columns:22px 1fr; gap:0 12px; padding:14px 0; border-top:1px solid var(--hair);}
.jx-claim:first-child{border-top:none; padding-top:4px;}
.jx-claim-dot{font-size:13px; line-height:1.5; padding-top:1px;}
.k-gap .jx-claim-dot{color:var(--gap);} .k-match .jx-claim-dot{color:var(--match);}
.k-outcome .jx-claim-dot{color:var(--outcome);} .k-signal .jx-claim-dot{color:var(--ink-soft);}
.jx-claim-text{margin:0; font-size:16px; line-height:1.45; color:var(--ink);}
.jx-claim-prov{margin:6px 0 0; font-family:var(--mono); font-size:11px; letter-spacing:.02em; color:var(--ink-soft);}
.jx-tag{color:var(--ink-mid);}
.k-outcome .jx-tag{color:var(--outcome);} .k-gap .jx-tag{color:var(--gap);} .k-match .jx-tag{color:var(--match);}
.jx-dot-sep{margin:0 7px; opacity:.5;}

.jx-foot{margin-top:36px; padding-top:26px; border-top:1px solid var(--hair-strong); display:flex; gap:16px; align-items:flex-start;}
.jx-foot-mark{font-size:14px; letter-spacing:4px; color:var(--accent); padding-top:2px;}
.jx-foot p{margin:0; max-width:60ch; font-size:13.5px; line-height:1.6; color:var(--ink-mid);}
.jx-state{min-height:60vh; display:flex; flex-direction:column; justify-content:center; gap:14px;}
.jx-state h2{font-family:var(--serif); font-weight:400; font-size:clamp(30px,5vw,46px); margin:0; line-height:1.05;}
.jx-muted{color:var(--ink-mid); max-width:48ch; font-size:16px; line-height:1.55; margin:0;}
.jx-err{font-family:var(--mono); font-size:12px; color:var(--neg); background:rgba(176,69,69,.08); padding:10px 12px; border-radius:4px;}
.jx-cta{display:inline-block; align-self:flex-start; font-family:var(--mono); font-size:13px; letter-spacing:.08em; color:var(--accent); text-decoration:none; border:1px solid var(--accent); border-radius:4px; padding:10px 18px; margin-top:6px;}
.jx-cta:hover{background:var(--accent); color:var(--bg);}
.jx-pulse{width:30px; height:30px; border-radius:50%; background:var(--accent); animation:jxp 1.3s ease-in-out infinite;}
@keyframes jxp{0%,100%{opacity:1; transform:scale(1);}50%{opacity:.35; transform:scale(.7);}}

@media (max-width:640px){
  .jx-wrap{padding:48px 20px 90px;}
  .jx-moment{grid-template-columns:1fr; gap:10px;}
  .jx-moment-rail{text-align:left;} .jx-spine,.jx-node-mark{display:none;}
  .jx-stats{gap:24px 32px;}
}
@media (prefers-reduced-motion:reduce){
  .jx-pip,.jx-moment{transition:none !important; opacity:1 !important; transform:none !important; stroke-dashoffset:0 !important;}
}
`;
