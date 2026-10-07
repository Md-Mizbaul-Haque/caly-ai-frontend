// Caly AI API client - point to your backend
// Set EXPO_PUBLIC_API_URL in .env, e.g. http://localhost:5000
import { getToken, handleUnauthorized } from './tokenStore';

export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';

async function authHeaders() {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const REQUEST_TIMEOUT_MS = 15000;

function newReportId() {
  return Math.random().toString(36).slice(2, 8);
}

function logApiError(id, method, path, outcome) {
  // No bodies or tokens here — method + path + outcome only.
  // console.info (not .error): handled failures must not red-screen dev builds.
  console.info(`[api #${id}] ${method} ${path} -> ${outcome}`);
}

function connectionError(id, method, path) {
  logApiError(id, method, path, 'network-failure');
  // Host only (no tokens/bodies): tells us instantly whether the phone is
  // pointed at a LAN URL it can't reach vs a real internet outage.
  console.info(`[api #${id}] target ${API_URL} (check same-WiFi + backend running)`);
  const err = new Error(`Couldn't connect to the server. Check your internet connection and try again. (Ref #${id})`);
  err.network = true;
  err.reportId = id;
  return err;
}

async function parseError(res, method, path, id) {
  const data = await res.json().catch(() => ({}));
  if (res.status >= 500) {
    logApiError(id, method, path, res.status);
    const err = new Error(`Something went wrong on our end. Please try again later. (Ref #${id})`);
    err.status = res.status;
    err.data = data;
    err.reportId = id;
    return err;
  }
  const detail = data.details && data.details[0] && data.details[0].message;
  const message = data.error || detail || `${method} ${path} failed: ${res.status}`;
  const err = new Error(message);
  err.status = res.status;
  err.data = data;
  return err;
}

async function request(method, path, { headers = {}, body } = {}) {
  const id = newReportId();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: { ...(await authHeaders()), ...headers },
      body,
      signal: ctrl.signal,
    });
  } catch (e) {
    throw connectionError(id, method, path);
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    // Login's 401 means "wrong credentials", not "expired session" — only
    // authenticated data routes trigger the logout-and-reroute path.
    if (res.status === 401 && path !== '/api/auth/login') {
      const err = await parseError(res, method, path, id);
      await handleUnauthorized();
      throw err;
    }
    throw await parseError(res, method, path, id);
  }
  return res.json();
}

export async function apiGet(path) {
  return request('GET', path);
}

export async function apiPost(path, data) {
  return request('POST', path, {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function apiPut(path, data) {
  return request('PUT', path, {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function apiDelete(path) {
  return request('DELETE', path);
}

// Multipart/form-data and other raw requests still need the auth header.
// timeoutMs is per-call: AI scan uploads + model inference can exceed the
// default 15 s on slow mobile networks, so scanApi passes a longer budget.
export async function authedFetch(path, options = {}) {
  const id = newReportId();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), options.timeoutMs || REQUEST_TIMEOUT_MS);
  let res;
  const { timeoutMs: _timeoutMs, ...fetchOptions } = options;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...fetchOptions,
      headers: { ...(await authHeaders()), ...(options.headers || {}) },
      signal: ctrl.signal,
    });
  } catch (e) {
    throw connectionError(id, options.method || 'GET', path);
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 401) await handleUnauthorized();
  return res;
}
