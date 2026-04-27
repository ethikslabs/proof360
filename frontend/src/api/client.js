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

// Session
export const startSession = (body) => request('POST', '/api/v1/session/start', body);
export const getInferStatus = (id) => request('GET', `/api/v1/session/${id}/infer-status`);
export const getInferences = (id) => request('GET', `/api/v1/session/${id}/inferences`);
export const submitSession = (id, body) => request('POST', `/api/v1/session/${id}/submit`, body);
export const getStatus = (id) => request('GET', `/api/v1/session/${id}/status`);
export const getReport = (id) => request('GET', `/api/v1/session/${id}/report`);
export const captureEmail = (id, body) => request('POST', `/api/v1/session/${id}/capture-email`, body);
export const getEarlySignal = (id) => request('GET', `/api/v1/session/${id}/early-signal`);
export const resumeSession = (id) => request('POST', `/api/v1/session/${id}/resume`);

// v1 mutation + publish + engage
export const postOverride = (sessionId, body) => request('POST', `/api/v1/session/${sessionId}/override`, body);
export const postResolveConflict = (sessionId, body) => request('POST', `/api/v1/session/${sessionId}/resolve-conflict`, body);
export const postRecompute = (sessionId) => request('POST', `/api/v1/session/${sessionId}/recompute`);
export const postPublish = (sessionId) => request('POST', `/api/v1/session/${sessionId}/publish`);
export const postEngage = (sessionId, body) => request('POST', `/api/v1/session/${sessionId}/engage`, body);

// overnight-v1: Feature flags, program match, admin pre-read
export const getFeatures = () => request('GET', '/api/features');
export const getProgramMatch = (sessionId) => request('GET', `/api/program-match/${sessionId}`);
export const submitPreread = (body, adminKey) => request('POST', '/api/admin/preread', body, { 'x-admin-key': adminKey });
export const getPrereadStatus = (batchId, adminKey) => request('GET', `/api/admin/preread/${batchId}`, null, { 'x-admin-key': adminKey });
