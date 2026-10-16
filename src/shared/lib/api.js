// Caly AI API client - point to your backend
// Set EXPO_PUBLIC_API_URL in .env, e.g. http://localhost:5000
import { getToken, handleUnauthorized, handleNeedsVerification } from './tokenStore';
import { classifyApiError, isRetryableCode } from './apiErrors';

export { classifyApiError, isRetryableCode };

export const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000').trim();

const REQUEST_TIMEOUT_MS = 15000;

function newReportId() {
  return Math.random().toString(36).slice(2, 8);
}

function logApiError(id, method, path, outcome) {
  // No bodies or tokens here — method + path + outcome only.
  // console.info (not .error): handled failures must not red-screen dev builds.
  console.info(`[api #${id}] ${method} ${path} -> ${outcome}`);
}

function isTimeoutCause(cause) {
  // Web gives AbortError; React Native/Hermes gives generic Error
  // ("fetch failed: Fetch request has been canceled"), undici similar.
  if (cause?.name === 'AbortError') return true;
  const msg = cause?.message || String(cause || '');
  return /abort|cancel/i.test(msg);
}

function connectionError(id, method, path, cause) {
  // A timer abort means the server was too slow, not unreachable — say so
  // and mark it non-retryable (retrying a 60 s timeout burns minutes).
  // Caller cancels (scan "Cancel") are also AbortErrors; the caller stays
  // silent via its own signal check, so this message is timeout-only here.
  const timedOut = cause?.timeout === true || isTimeoutCause(cause);
  logApiError(id, method, path, `network-failure: ${cause?.name || ''} ${cause?.message || cause}`);
  // Host only (no tokens/bodies): LAN URLs mean the phone can't reach the
  // PC; hosted URLs (Render etc) mean cold start or a down backend.
  const isLan = /localhost|127\.0\.0\.1|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\./.test(API_URL);
  console.info(`[api #${id}] target ${API_URL} (${isLan ? 'check same-WiFi + backend running' : 'backend may be waking up — retry in ~30 s'})`);
  const err = new Error(
    timedOut
      ? `The server is taking too long (it may be waking up). Check your connection, then retry. (Ref #${id})`
      : `Couldn't connect to the server at ${API_URL}. Check your internet connection and try again. (Ref #${id})`
  );
  err.network = !timedOut;
  err.timeout = timedOut;
  err.reportId = id;
  err.code = timedOut ? 'TIMEOUT_WAKE' : 'UNREACHABLE';
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
    err.code = 'HTTP_5xx';
    return err;
  }
  const detail = data.details && data.details[0] && data.details[0].message;
  const message = data.error || detail || `${method} ${path} failed: ${res.status}`;
  const err = new Error(message);
  err.status = res.status;
  err.data = data;
  err.code = res.status === 401 ? 'UNAUTHORIZED' : 'HTTP_4xx';
  return err;
}

async function request(method, path, { headers = {}, body } = {}) {
  const id = newReportId();
  // GETs are idempotent: one retry survives a Render cold start or a
  // transient 5xx (first attempt wakes/faults the instance, second hits it
  // healthy). Code-issuing auth POSTs (register/resend/forgot) are equally
  // safe to repeat — each attempt just mints a fresh code on the same
  // pending row — so they get 3 attempts and also retry timeouts, network
  // failures, AND 5xx (a waking server answers 503 'database unavailable'
  // before Mongo lands). 4xx (wrong credentials, validation) never retries.
  // Everything else (verify, skip, data writes, scan) stays single-attempt.
  const retryablePost = method === 'POST' && /\/api\/auth\/(register|resend-code|forgot-password)$/.test(path);
  const attempts = method === 'GET' ? 2 : retryablePost ? 3 : 1;
  let lastCause;
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 2000));
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
    // The token this attempt actually sends: a late 401 must only log out
    // the session it belonged to, not a newer one.
    const token = await getToken();
    try {
      const res = await fetch(`${API_URL}${path}`, {
        method,
        // X-Request-Id carries the Ref # so one backend log line matches
        // this exact request (the server echoes it back).
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'X-Request-Id': id, ...headers },
        body,
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (!res.ok) {
        const err = await parseError(res, method, path, id);
        // Login's 401 means "wrong credentials", not "expired session" — only
        // authenticated data routes trigger the logout-and-reroute path.
        if (res.status === 401 && path !== '/api/auth/login') {
          await handleUnauthorized(token);
        } else if (
          res.status === 403 &&
          err.data?.needsVerification &&
          !path.startsWith('/api/auth/')
        ) {
          // Verified-only data route hit by an unverified account: send the
          // user to verify (the auth endpoints handle their own 403s).
          await handleNeedsVerification();
        }
        throw err;
      }
      // Guarded like parseError: a 200 with non-JSON (proxy error page) must
      // not surface as a raw SyntaxError.
      return res.json().catch(() => ({}));
    } catch (e) {
      clearTimeout(timer);
      const retry5xx = (method === 'GET' || retryablePost) && e?.status >= 500;
      if ((e?.status && !retry5xx) || attempts === 1 || attempt === attempts - 1) {
        if (!e?.status) throw connectionError(id, method, path, e);
        throw e;
      }
      lastCause = e;
    }
  }
  throw connectionError(id, method, path, lastCause);
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
  let didTimeout = false;
  const timer = setTimeout(() => {
    didTimeout = true;
    ctrl.abort();
  }, options.timeoutMs || REQUEST_TIMEOUT_MS);
  // A caller abort (e.g. Scan "Cancel") must stop our request too — fetch
  // only honors one signal, so link the caller's to ours.
  const { timeoutMs: _timeoutMs, signal: externalSignal, ...fetchOptions } = options;
  if (externalSignal) {
    if (externalSignal.aborted) ctrl.abort();
    else externalSignal.addEventListener('abort', () => ctrl.abort(), { once: true });
  }
  let res;
  const token = await getToken();
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...fetchOptions,
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'X-Request-Id': id, ...(options.headers || {}) },
      signal: ctrl.signal,
    });
   } catch (e) {
     // didTimeout wins over message sniffing: on RN Android an abort
     // rejects with generic "Network request failed", which contains no
     // abort/cancel substring. Caller-cancel (externalSignal) leaves
     // didTimeout false, so Cancel stays silent via the caller's own check.
     if (didTimeout) {
       e = e || new Error('timeout');
       e.timeout = true;
     }
     throw connectionError(id, options.method || 'GET', path, e);
   } finally {
    clearTimeout(timer);
  }
  if (res.status === 401) await handleUnauthorized(token);
  return res;
}
