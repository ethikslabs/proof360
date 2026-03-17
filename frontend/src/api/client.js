const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

async function request(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
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
