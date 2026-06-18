import { getAccessToken } from './auth.js';

const BASE = import.meta.env.VITE_API_BASE_URL ?? '';
const DEMO_FOUNDER = import.meta.env.VITE_DEMO_FOUNDER_MODE === 'true';

async function request(method, path, body, extraHeaders) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE}${path}`, opts);
  const raw = await res.text();
  const data = raw ? JSON.parse(raw) : {};

  if (!res.ok) {
    const err = new Error(data.error || 'Something went wrong');
    err.code = data.code;
    err.status = res.status;
    throw err;
  }

  return data;
}

async function authRequest(method, path, body) {
  const token = await getAccessToken();
  if (!token) {
    const err = new Error('not authenticated');
    err.status = 401;
    throw err;
  }
  return request(method, path, body, { Authorization: `Bearer ${token}` });
}

// v1 mutation + publish + engage
export const postOverride = (sessionId, body) => request('POST', `/api/v1/session/${sessionId}/override`, body);
export const postResolveConflict = (sessionId, body) => request('POST', `/api/v1/session/${sessionId}/resolve-conflict`, body);
export const postRecompute = (sessionId) => request('POST', `/api/v1/session/${sessionId}/recompute`);
export const postPublish = (sessionId) => request('POST', `/api/v1/session/${sessionId}/publish`);
export const postEngage = (sessionId, body) => request('POST', `/api/v1/session/${sessionId}/engage`, body);

// overnight-v1: Feature flags, admin pre-read
export const getFeatures = () => request('GET', '/api/features');
export const submitPreread = (body, adminKey) => request('POST', '/api/admin/preread', body, { 'x-admin-key': adminKey });
export const getPrereadStatus = (batchId, adminKey) => request('GET', `/api/admin/preread/${batchId}`, null, { 'x-admin-key': adminKey });

// Founder Memory V1
export const getProfile = () => authRequest('GET', '/api/v1/profile/current');
export const getProjections = () => authRequest('GET', '/api/v1/profile/current/projections');
export const postProfileEvent = (body) => authRequest('POST', '/api/v1/profile/current/events', body);
export const attachSessionToProfile = (sessionId, body) => authRequest('POST', `/api/v1/sessions/${sessionId}/profile`, body);

// Founder Journey (HRR v1)
export const getJourney = () =>
  DEMO_FOUNDER
    ? request('GET', '/api/v1/profile/current/journey')        // demo: no token needed (backend gate is demoAuth)
    : authRequest('GET', '/api/v1/profile/current/journey');   // prod: real Auth0 token
