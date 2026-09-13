// session-usage.js — the tokens a read spent, on the session, per act.
//
// John ruling 2026-09-13 (R7, CANON-hx-loop): "We pay for now — but we log the cost per call, and
// show the tokens in the read, and then collapse. Then we can have a token count in the account —
// so people can see that." Tokens only here — pricing is PULSUS's plane (prices.ts, cost-deriver.ts)
// and proof360 does not hold a price table. The estate usage ledger (usage-event.v1, meter.mjs)
// stays the SSOT for billing; this is the per-session view a founder can see, kept beside the
// session so the trace and the account can read it without walking the ledger.
//
// Numbers about the read, never about the company (Law 4): a token is what we spent looking,
// not a grade on what we found.
import { getSession, updateSession } from './session-store.js';

const MAX_EVENTS = 200;

/** Normalise one provider call into { provider, model, act, in, out, at }. Missing = 0, never NaN. */
export function usageEvent({ provider = 'unknown', model = 'unknown', act = null, in: inT = 0, out: outT = 0, at } = {}) {
  const n = (v) => (Number.isFinite(Number(v)) && Number(v) >= 0 ? Math.round(Number(v)) : 0);
  return { provider, model, act, in: n(inT), out: n(outT), at: at || new Date().toISOString() };
}

/**
 * Record one provider call against a session. Best-effort and silent: metering must never block
 * inference (same contract as meter.emit). A correlation id that is not a live session is ignored —
 * the estate ledger still has the event.
 */
export function tallyUsage(sessionId, fields) {
  try {
    if (!sessionId) return null;
    const session = getSession(sessionId);
    if (!session) return null;
    const ev = usageEvent(fields);
    const events = [...(session.usage_events || []), ev].slice(-MAX_EVENTS);
    updateSession(sessionId, { usage_events: events });
    return ev;
  } catch {
    return null;
  }
}

/** The per-session summary the trace, the receipt and the account read. Pure over the session. */
export function usageSummary(session) {
  const events = Array.isArray(session?.usage_events) ? session.usage_events : [];
  const total = { in: 0, out: 0, total: 0 };
  const by_provider = {};
  const by_act = {};
  for (const e of events) {
    const t = (e.in || 0) + (e.out || 0);
    total.in += e.in || 0; total.out += e.out || 0; total.total += t;
    const p = by_provider[e.provider] || (by_provider[e.provider] = { calls: 0, in: 0, out: 0, total: 0 });
    p.calls += 1; p.in += e.in || 0; p.out += e.out || 0; p.total += t;
    const key = e.act || 'other';
    const a = by_act[key] || (by_act[key] = { calls: 0, in: 0, out: 0, total: 0 });
    a.calls += 1; a.in += e.in || 0; a.out += e.out || 0; a.total += t;
  }
  return { calls: events.length, tokens: total, by_provider, by_act };
}

/** Tokens for one act — the number the act's "done" line carries. */
export function actTokens(session, act) {
  const s = usageSummary(session);
  const a = s.by_act[act];
  return a ? { in: a.in, out: a.out, total: a.total, calls: a.calls } : null;
}

/** Sum of summaries across sessions — the account total (step 4). Tokens only. */
export function sumUsage(sessions) {
  const out = { sessions: 0, calls: 0, tokens: { in: 0, out: 0, total: 0 } };
  for (const s of sessions || []) {
    const u = usageSummary(s);
    out.sessions += 1; out.calls += u.calls;
    out.tokens.in += u.tokens.in; out.tokens.out += u.tokens.out; out.tokens.total += u.tokens.total;
  }
  return out;
}
