// spine.js — the frontend's one door to the Record spine (ETHL-WRK-SPEC-011):
// truth ladder, shortlist Moves, receipts ("Our working"), firehose intake.
//
// Return path ("simple to return to", John 2026-08-23): the session id lives in
// localStorage — it must survive the closed laptop, the Uber, the baby. Reads
// migrate any legacy sessionStorage id forward once.

const KEY = 'proof360_session_id';

export function storedSessionId() {
  try {
    const local = localStorage.getItem(KEY);
    if (local) return local;
    const legacy = sessionStorage.getItem(KEY);
    if (legacy) {
      localStorage.setItem(KEY, legacy);
      return legacy;
    }
    return null;
  } catch {
    return null;
  }
}

export function rememberSessionId(id) {
  try {
    localStorage.setItem(KEY, id);
    sessionStorage.setItem(KEY, id); // legacy readers still see it
  } catch {
    // storage unavailable — session lives for this page only
  }
}

export function forgetSessionId() {
  try {
    localStorage.removeItem(KEY);
    sessionStorage.removeItem(KEY);
  } catch { /* no-op */ }
}

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const err = new Error(`spine_fetch_failed:${url}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) {
    const err = new Error(`spine_post_failed:${url}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

// The Record — truth-ladder claims { claims: [{claim_id, field, label, value, status, provenance}], ... }
export const getRecord = (sessionId) =>
  getJson(`/api/v1/session/${sessionId}/record`);

// Answer one claim: action = confirm | correct | reject (correct carries value)
export const answerClaim = (sessionId, claimId, action, value = null) =>
  postJson(`/api/v1/session/${sessionId}/claims/${claimId}/answer`, { action, ...(value != null ? { value } : {}) });

// Live proposals (derived, confirmed-claims-only) and the shortlist of Moves
export const getProposals = (sessionId) =>
  getJson(`/api/v1/session/${sessionId}/proposals`);

export const acceptProposal = (sessionId, proposalId, editedReason = null) =>
  postJson(`/api/v1/session/${sessionId}/proposals/${proposalId}/accept`,
    editedReason ? { edited_reason: editedReason } : {});

// Live persona follow-up chips — three lenses, record-grounded; 0 or 3 entries.
export const getFollowups = (sessionId) =>
  getJson(`/api/v1/session/${sessionId}/followups`);

export const getShortlist = (sessionId) =>
  getJson(`/api/v1/session/${sessionId}/shortlist`);

// Universal add (discovery's one uniform action) — { name, category?, why?, source? }
export const addToShortlist = (sessionId, item) =>
  postJson(`/api/v1/session/${sessionId}/shortlist`, item);

// "Our working" — the retrieval receipts behind grounded answers
export const getReceipts = (sessionId) =>
  getJson(`/api/v1/session/${sessionId}/chat/receipts`);

// Chat history (the resume path)
export const getChatHistory = (sessionId) =>
  getJson(`/api/v1/session/${sessionId}/chat/history`);

// Firehose — cold read from nothing: the founder just talks
export const firehose = (utterance) =>
  postJson('/api/v1/firehose', { utterance });
