const BASE = import.meta.env.VITE_API_BASE_URL ?? '';

async function request(method, path, body, extraHeaders) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE}${path}`, opts);
  const data = await res.json();

  if (!res.ok) {
    const err = new Error(data.error || 'Something went wrong');
    err.code = data.code;
    err.status = res.status;
    throw err;
  }

  return data;
}

// v1 mutation + publish + engage
export const postOverride = (sessionId, body) => request('POST', `/api/v1/session/${sessionId}/override`, body);
export const postResolveConflict = (sessionId, body) => request('POST', `/api/v1/session/${sessionId}/resolve-conflict`, body);
export const postRecompute = (sessionId) => request('POST', `/api/v1/session/${sessionId}/recompute`);
export const postPublish = (sessionId) => request('POST', `/api/v1/session/${sessionId}/publish`);
export const postEngage = (sessionId, body) => request('POST', `/api/v1/session/${sessionId}/engage`, body);

// proof360.au/live — verification console (real machinery, ephemeral sandbox)
export const liveStatus = () => request('GET', '/api/v1/live/status');
export const liveMint = (sessionId) => request('POST', '/api/v1/live/mint', { session_id: sessionId });
export const liveTamper = (sessionId) => request('POST', '/api/v1/live/tamper', { session_id: sessionId });
export const liveAttest = (claim) => request('POST', '/api/v1/live/attest', { claim });
export const liveAgent = (history, sessionId) => request('POST', '/api/v1/live/agent', { history, session_id: sessionId });

// overnight-v1: Feature flags, admin pre-read
export const getFeatures = () => request('GET', '/api/features');
export const submitPreread = (body, adminKey) => request('POST', '/api/admin/preread', body, { 'x-admin-key': adminKey });
export const getPrereadStatus = (batchId, adminKey) => request('GET', `/api/admin/preread/${batchId}`, null, { 'x-admin-key': adminKey });
