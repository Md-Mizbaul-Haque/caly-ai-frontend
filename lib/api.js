// Caly AI API client - point to your backend
// Set EXPO_PUBLIC_API_URL in .env, e.g. http://localhost:5000
import { getToken, handleUnauthorized } from '../src/lib/tokenStore';

export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';

async function authHeaders() {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function connectionError() {
  const err = new Error("Couldn't connect to the server. Check your internet connection and try again.");
  err.network = true;
  return err;
}

async function parseError(res, method, path) {
  const data = await res.json().catch(() => ({}));
  if (res.status >= 500) {
    const err = new Error('Something went wrong on our end. Please try again later.');
    err.status = res.status;
    err.data = data;
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
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: { ...(await authHeaders()), ...headers },
      body,
    });
  } catch (e) {
    throw connectionError();
  }
  if (!res.ok) {
    // Login's 401 means "wrong credentials", not "expired session" — only
    // authenticated data routes trigger the logout-and-reroute path.
    if (res.status === 401 && path !== '/api/auth/login') {
      const err = await parseError(res, method, path);
      await handleUnauthorized();
      throw err;
    }
    throw await parseError(res, method, path);
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
export async function authedFetch(path, options = {}) {
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { ...(await authHeaders()), ...(options.headers || {}) },
    });
  } catch (e) {
    throw connectionError();
  }
  if (res.status === 401) await handleUnauthorized();
  return res;
}
