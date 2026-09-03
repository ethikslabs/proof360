import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getJourney } from '../api/client';
import register from '../data/capital-register.json';
import { readinessVector, unpricedInversion, CLASSES } from '../utils/capitalJoin.js';
import { claimSetFrom } from '../utils/rosettaClaimSet.js';

// /raise — the founder's raise designer. A projection of the Capital Rosetta join
// (utils/capitalJoin.js) over the ratified register (data/capital-register.json, projected
// from the markdown by scripts/project-register.mjs) against the founder's own record
// (utils/rosettaClaimSet.js, from the same claims /journey renders).
//
// What it will not do: rank. The register's rule 10 — nothing is ranked inside it — is
// the page's rule. Instruments appear in register order; each says reachable / gap /
// blocked / could-not-check in its own words; the disagreement is the information.
// The only arithmetic here is the founder's own inputs (need ÷ ownership = implied cap),
// labelled as such. An investor's returns view is not this page.

const JURISDICTIONS = ['AU', 'SG', 'US'];
const CLASS_LABEL = {
  IDENT: 'Identity & structure', FNDR: 'Founder & team', PROB: 'Problem & market', PROD: 'Product & technology',
  TRAC: 'Traction', UNIT: 'Unit economics', FIN: 'Financial history', CASH: 'Cash flow & security',
  GOV: 'Governance & compliance', USE: 'Use of funds', EXIT: 'Return path', REL: 'Relationship graph',
  IMPACT: 'Impact & mandate fit', OPS: 'Operating capability',
};
const fmt = (n) => 'AUD ' + Math.round(n).toLocaleString();
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : null);

function stateOf(r) {
  if (r.blocked.length) return 'blocked';
  if (r.gaps.length) return 'gap';
  return 'reachable';
}
const STATE_WORD = { reachable: 'reachable', gap: 'gap', blocked: 'blocked' };

function InstrumentCard({ record, r, selected, onPick }) {
  const state = stateOf(r);
  const note = state === 'blocked'
    ? r.blocked[0].description
    : state === 'gap'
      ? `${r.gaps[0].class} needs ${r.gaps[0].needed} — you hold ${r.gaps[0].held}${r.gaps.length > 1 ? ` · +${r.gaps.length - 1} more` : ''}`
      : 'every required class held at threshold';
  const requires = Object.entries(record.requires).map(([c, t]) => `${c}@${t}`).join(' · ') || 'nothing specific';
  return (
    <button type="button" onClick={onPick} className={`rx-card ${state} ${selected ? 'on' : ''}`} aria-pressed={selected}>
      <div className="rx-card-head">
        <span className="rx-card-name">{record.name || record.id}</span>
        <span className={`rx-state ${state}`}>{STATE_WORD[state]}</span>
      </div>
      {record.one_line && <div className="rx-card-line">{record.one_line}</div>}
      <div className="rx-card-meta">
        {record.family}{record.mechanics.dilutive != null && <> · dilutive {String(record.mechanics.dilutive)}</>}{record.mechanics.repayable != null && <> · repayable {String(record.mechanics.repayable)}</>}<br />
        requires {requires}<br />
        {note}
        {r.unevaluated.length > 0 && <><br /><span className="rx-uneval">{r.unevaluated.length} condition{r.unevaluated.length === 1 ? '' : 's'} we could not check</span></>}
      </div>
    </button>
  );
}

function Row({ k, v }) {
  return <div className="rx-row"><span className="rx-k">{k}</span><span className="rx-v">{v == null || v === '' ? '—' : Array.isArray(v) ? v.join(' · ') : String(v)}</span></div>;
}

export default function Raise() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [need, setNeed] = useState(1500000);
  const [give, setGive] = useState(12.5);
  const [jurisdiction, setJurisdiction] = useState('AU');
  const [pick, setPick] = useState(register.records[0]?.id ?? null);

  useEffect(() => { getJourney().then(setData).catch((e) => setError(String(e))); }, []);

  const entity = useMemo(() => claimSetFrom(data?.entries || [], { jurisdiction }), [data, jurisdiction]);
  const vector = useMemo(() => readinessVector(entity, register.records), [entity]);
  const inversion = useMemo(() => unpricedInversion(entity, register.records), [entity]);
  const byId = useMemo(() => Object.fromEntries(register.records.map((x) => [x.id, x])), []);
  const record = byId[pick] || register.records[0];
  const r = vector.find((x) => x.instrument_id === record?.id);
  const impliedCap = give > 0 ? need / (give / 100) : null;
  const heldCount = CLASSES.filter((c) => entity.held[c] !== 'absent').length;
  const variant = record?.jurisdiction?.variants?.find((v) => new RegExp(`\\b${jurisdiction}\\b|${{ AU: 'Australia', SG: 'Singapore', US: 'US' }[jurisdiction]}`, 'i').test(v.jurisdiction || ''));

  if (error && /not authenticated/i.test(error)) {
    return (
      <Shell>
        <div className="rx-state-page">
          <p className="rx-eyebrow">the raise</p>
          <h2>Sign in to design your raise.</h2>
          <p className="rx-muted">It reads from your own record — for your eyes.</p>
          <a className="rx-cta" href="/account/login">Sign in →</a>
        </div>
      </Shell>
    );
  }
  if (error) {
    return (
      <Shell>
        <div className="rx-state-page">
          <p className="rx-eyebrow">the raise</p>
          <h2>We couldn&rsquo;t read your record just now.</h2>
          <p className="rx-muted">{error}</p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <header className="rx-head">
        <p className="rx-eyebrow">proof360 · the raise · from the register</p>
        <h1 className="rx-title">
          <span className="rx-title-co">{data?.company?.name || 'Your company'}</span>
          <span className="rx-title-sub">— first time round? here are your options</span>
        </h1>
        <p className="rx-dek">
          Every way capital can enter a company, joined against what your record already holds.
          No instrument is put above another — each says where you stand in its own words, and where they
          disagree is the useful part. <Link to="/journey">Your record →</Link>
        </p>
        <div className="rx-stats">
          <Stat k={String(register.record_count)} l="instruments" />
          <Stat k={`${register.record_count - register.unverified.length} of ${register.record_count}`} l="verified" />
          <Stat k={`${heldCount} of ${CLASSES.length}`} l="classes held" />
          <Stat k={data ? String(data.entries?.length ?? 0) : '…'} l="chapters read" />
        </div>
      </header>

      {/* The founder's inputs — the only numbers on this page that are not the register's */}
      <section className="rx-panel">
        <div className="rx-label"><span>plug in what you know · your numbers, your arithmetic</span></div>
        <div className="rx-inputs">
          <label className="rx-input">
            <span className="rx-k">how much you need</span>
            <input type="range" min="250000" max="5000000" step="50000" value={need} onChange={(e) => setNeed(+e.target.value)} />
            <span className="rx-v mono">{fmt(need)}</span>
          </label>
          <label className="rx-input">
            <span className="rx-k">ownership you&rsquo;d give</span>
            <input type="range" min="5" max="35" step="0.5" value={give} onChange={(e) => setGive(+e.target.value)} />
            <span className="rx-v mono">{give}%</span>
          </label>
          <div className="rx-input">
            <span className="rx-k">jurisdiction</span>
            <div className="rx-juris" role="radiogroup" aria-label="jurisdiction">
              {JURISDICTIONS.map((j) => (
                <button key={j} type="button" role="radio" aria-checked={jurisdiction === j} className={jurisdiction === j ? 'on' : ''} onClick={() => setJurisdiction(j)}>{j}</button>
              ))}
            </div>
          </div>
        </div>
        <p className="rx-muted">
          Implied valuation cap at {give}% for {fmt(need)}: <strong className="mono">{impliedCap ? fmt(impliedCap) : '—'}</strong>.
          That is your division, not the register&rsquo;s.
        </p>
      </section>

      {/* The readiness vector — register order, never re-sorted */}
      <section className="rx-grid" aria-label="Instruments, joined against your record">
        {register.records.map((rec) => {
          const rr = vector.find((x) => x.instrument_id === rec.id);
          return <InstrumentCard key={rec.id} record={rec} r={rr} selected={rec.id === record?.id} onPick={() => setPick(rec.id)} />;
        })}
      </section>

      {record && r && (
        <section className="rx-detail">
          <div className="rx-panel">
            <div className="rx-label"><span>{record.name} · mechanics · {record.depth || 'depth —'}</span>
              <span className={record.evidence.last_verified ? 'rx-ok' : 'rx-warn'}>
                {record.evidence.last_verified ? `verified ${fmtDate(record.evidence.last_verified)}` : 'unverified — a rumour by the register’s own rule'}
              </span>
            </div>
            <Row k="family" v={record.family} />
            <Row k="status" v={record.status} />
            <Row k="consideration in → out" v={[...(record.mechanics.consideration_in || []), '→', ...(record.mechanics.consideration_out || [])]} />
            <Row k="dilutive · repayable" v={`${record.mechanics.dilutive ?? '—'} · ${record.mechanics.repayable ?? '—'}`} />
            <Row k="conversion" v={record.mechanics.conversion} />
            <Row k="security · seniority" v={`${record.mechanics.security_taken ?? '—'} · ${record.mechanics.seniority ?? '—'}`} />
            <Row k="cost of capital form" v={record.mechanics.cost_of_capital_form} />
            <Row k="typical ticket · time to close" v={`${record.mechanics.ticket_typical ?? '—'} · ${record.mechanics.time_to_close ?? '—'}`} />
            <Row k="reversibility" v={record.reversibility.reversibility} />
            {record.reversibility.forecloses?.length > 0 && <Row k="forecloses" v={record.reversibility.forecloses} />}
            {variant && <Row k={`in ${variant.jurisdiction}`} v={variant.delta} />}
            {record.knowledge?.misconceptions && <p className="rx-know"><span className="rx-k">misconception</span> {record.knowledge.misconceptions}</p>}
            {record.knowledge?.tells && <p className="rx-know"><span className="rx-k">tell</span> {record.knowledge.tells}</p>}
          </div>

          <div className="rx-panel">
            <div className="rx-label"><span>where you stand · the join</span></div>
            {r.blocked.map((b) => <p key={b.id} className="rx-cell blocked">blocked — {b.description}. No amount of evidence fixes this.</p>)}
            {r.gaps.map((g) => (
              <p key={g.class} className="rx-cell gap">gap — {CLASS_LABEL[g.class]} needs <em>{g.needed}</em>; you hold <em>{g.held}</em>.</p>
            ))}
            {r.satisfied.map((s) => (
              <p key={s.class} className="rx-cell ok">held — {CLASS_LABEL[s.class]} at <em>{s.held}</em> (needs {s.needed}).</p>
            ))}
            {r.helpful.missing.length > 0 && <p className="rx-cell soft">would help, not required: {r.helpful.missing.map((c) => CLASS_LABEL[c]).join(', ')}.</p>}
            {r.unevaluated.length > 0 && (
              <div className="rx-cell uneval">
                <div>We could not check {r.unevaluated.length} condition{r.unevaluated.length === 1 ? '' : 's'} — the register states {r.unevaluated.length === 1 ? 'it' : 'them'} in words, not as something the record can answer:</div>
                <ul>{r.unevaluated.map((u) => <li key={u.id}>{u.description}</li>)}</ul>
              </div>
            )}
            {r.unpriced.length > 0 && (
              <div className="rx-cell unpriced">
                <div className="rx-k">what you hold that this instrument does not price — and who does</div>
                <ul>
                  {r.unpriced.map((c) => (
                    <li key={c}><strong>{CLASS_LABEL[c]}</strong> at {entity.held[c]}{inversion[c]?.length ? <> → {inversion[c].filter((id) => id !== record.id).map((id) => byId[id]?.name || id).join(' · ') || 'no other instrument in the register'}</> : <> → nothing in the register prices it yet</>}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      <footer className="rx-foot">
        Register: {register.source} · {register.record_count} records · projected {fmtDate(register.projected_at)} · source {register.source_sha256.slice(0, 12)}.
        {register.unverified.length > 0 && <> {register.unverified.length} records carry no verification date and say so above.</>}
      </footer>
    </Shell>
  );
}

function Stat({ k, l }) {
  return <div className="rx-stat"><span className="rx-stat-k">{k}</span><span className="rx-stat-l">{l}</span></div>;
}

function Shell({ children }) {
  return (
    <div className="rx-root">
      <style>{CSS}</style>
      <div className="rx-wrap">{children}</div>
    </div>
  );
}

const CSS = `
.rx-root{
  --ink:var(--p360-ink); --ink-mid:var(--p360-inkMid); --ink-soft:var(--p360-inkSoft);
  --hair:var(--p360-hairline); --hair-strong:var(--p360-hairStrong); --surface:var(--p360-surface); --surface-lo:var(--p360-surfaceLo, var(--p360-bgTint));
  --accent:var(--p360-plum); --pos:var(--p360-sevOk); --neg:var(--p360-sevHigh); --warn:var(--p360-sevMed); --teal:var(--p360-teal);
  --serif:var(--p360-serif); --sans:var(--p360-sans); --mono:var(--p360-mono);
  position:relative; min-height:100vh; color:var(--ink); font-family:var(--sans); -webkit-font-smoothing:antialiased; overflow-x:hidden;
  background:radial-gradient(120% 80% at 82% -12%, #ffffff 0%, var(--p360-bg) 46%, var(--p360-bgTint) 100%);
}
.rx-wrap{position:relative; z-index:1; max-width:1040px; margin:0 auto; padding:64px 28px 120px;}
.rx-eyebrow{font-family:var(--mono); font-size:11px; letter-spacing:.32em; text-transform:uppercase; color:var(--accent); margin:0 0 18px;}
.rx-title{margin:0; line-height:.96; font-weight:400; letter-spacing:-.01em;}
.rx-title-co{display:block; font-family:var(--serif); font-size:clamp(40px,7vw,72px); color:var(--ink);}
.rx-title-sub{display:block; font-family:var(--serif); font-style:italic; font-size:clamp(20px,3vw,30px); color:var(--ink-mid); margin-top:6px;}
.rx-dek{max-width:60ch; margin:22px 0 0; font-size:15.5px; line-height:1.55; color:var(--ink-mid);} .rx-dek a{color:var(--accent);}
.rx-stats{display:flex; flex-wrap:wrap; gap:28px 40px; margin-top:34px; padding-top:26px; border-top:1px solid var(--hair-strong);}
.rx-stat{display:flex; flex-direction:column; gap:6px;} .rx-stat-k{font-family:var(--serif); font-size:30px; line-height:1; color:var(--ink);}
.rx-stat-l{font-family:var(--mono); font-size:10px; letter-spacing:.22em; text-transform:uppercase; color:var(--ink-soft);}
.rx-panel{margin-top:28px; background:var(--surface); border:1px solid var(--hair); border-radius:4px; padding:16px 18px; box-shadow:0 18px 40px -34px rgba(34,28,46,.5);}
.rx-label{display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap; font-family:var(--mono); font-size:9.5px; letter-spacing:.18em; text-transform:uppercase; color:var(--ink-soft); margin-bottom:12px;}
.rx-ok{color:var(--pos);} .rx-warn{color:var(--warn);}
.rx-inputs{display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:14px 22px;}
.rx-input{display:flex; flex-direction:column; gap:6px;} .rx-input input[type=range]{width:100%;}
.rx-k{font-family:var(--mono); font-size:9.5px; letter-spacing:.12em; text-transform:uppercase; color:var(--ink-soft);}
.rx-v{font-size:13px; color:var(--ink); text-align:right;} .mono{font-family:var(--mono); font-size:12px;}
.rx-juris{display:flex; gap:4px;} .rx-juris button{flex:1; padding:6px 0; border-radius:6px; border:1px solid var(--hair); background:transparent; color:var(--ink-mid); cursor:pointer; font-family:var(--mono); font-size:11px;}
.rx-juris button.on{background:var(--ink); color:#fff; border-color:var(--ink);}
.rx-muted{font-size:12.5px; color:var(--ink-mid); margin:12px 0 0; line-height:1.5;}
.rx-grid{display:grid; grid-template-columns:repeat(auto-fill,minmax(270px,1fr)); gap:12px; margin-top:24px;}
.rx-card{text-align:left; background:var(--surface); border:1px solid var(--hair); border-left:3px solid var(--ink-soft); border-radius:4px; padding:14px 16px; cursor:pointer; font-family:var(--sans); display:flex; flex-direction:column; gap:6px; color:var(--ink);}
.rx-card:hover{border-color:var(--hair-strong);} .rx-card.on{border-color:var(--accent); box-shadow:0 18px 44px -38px rgba(34,28,46,.55);}
.rx-card.reachable{border-left-color:var(--pos);} .rx-card.gap{border-left-color:var(--warn);} .rx-card.blocked{border-left-color:var(--neg);}
.rx-card-head{display:flex; justify-content:space-between; gap:8px; align-items:baseline;}
.rx-card-name{font-family:var(--serif); font-size:19px;}
.rx-state{font-family:var(--mono); font-size:9px; letter-spacing:.12em; text-transform:uppercase;} .rx-state.reachable{color:var(--pos);} .rx-state.gap{color:var(--warn);} .rx-state.blocked{color:var(--neg);}
.rx-card-line{font-size:12.5px; line-height:1.5; color:var(--ink-mid);}
.rx-card-meta{font-family:var(--mono); font-size:10px; color:var(--ink-soft); line-height:1.7;} .rx-uneval{color:var(--warn);}
.rx-detail{display:grid; grid-template-columns:repeat(auto-fit,minmax(300px,1fr)); gap:14px; margin-top:4px;}
.rx-row{display:flex; justify-content:space-between; gap:12px; padding:5px 0; border-bottom:1px solid var(--hair); font-size:12.5px;} .rx-row .rx-v{font-family:var(--mono); font-size:11.5px;}
.rx-know{margin:10px 0 0; font-size:12px; line-height:1.55; color:var(--ink-mid);} .rx-know .rx-k{margin-right:6px;}
.rx-cell{margin:0 0 8px; font-size:13px; line-height:1.5; color:var(--ink);} .rx-cell em{font-style:normal; font-family:var(--mono); font-size:11.5px;}
.rx-cell.blocked{color:var(--neg);} .rx-cell.gap{color:var(--ink);} .rx-cell.ok{color:var(--ink-mid);} .rx-cell.soft{color:var(--ink-soft);}
.rx-cell.uneval{border:1px dashed var(--hair-strong); border-radius:4px; padding:10px 12px; color:var(--ink-mid); font-size:12.5px;} .rx-cell ul{margin:6px 0 0; padding-left:18px;}
.rx-cell.unpriced{border-top:1px solid var(--hair); padding-top:10px; margin-top:12px;} .rx-cell.unpriced ul{list-style:none; padding:0; margin:8px 0 0;} .rx-cell.unpriced li{font-size:12.5px; margin-bottom:4px;}
.rx-foot{margin-top:36px; padding-top:20px; border-top:1px solid var(--hair-strong); font-family:var(--mono); font-size:10px; color:var(--ink-soft); line-height:1.7;}
.rx-state-page{max-width:520px; margin:60px auto; text-align:center;} .rx-state-page h2{font-family:var(--serif); font-weight:400; font-size:34px; margin:0 0 12px;}
.rx-cta{display:inline-block; margin-top:8px; padding:10px 20px; border-radius:999px; background:var(--ink); color:#fff; text-decoration:none; font-size:14px;}
@media (max-width:640px){ .rx-wrap{padding:44px 18px 80px;} }
`;
