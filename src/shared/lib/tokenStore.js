import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'caly-auth-token';

let cached = null;
let loaded = false;
let sessionExpiredHandler = null;
let needsVerificationHandler = null;

export async function getToken() {
  if (loaded) return cached;
  try {
    cached = await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    // Transient keystore failure: stay unloaded so the next call retries
    // instead of caching "logged out" for the rest of the session.
    return null;
  }
  loaded = true;
  return cached;
}

export function getCachedToken() {
  return cached;
}

export async function setToken(token) {
  cached = token;
  loaded = true;
  if (token) {
    await SecureStore.setItemAsync(TOKEN_KEY, token).catch(() => {});
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
  }
}

export function setSessionExpiredHandler(handler) {
  sessionExpiredHandler = handler;
}

// Called by the API layer on a 403 needsVerification from a data route:
// the account exists but the mailbox is unverified, so the app must send the
// user to the verify screen instead of leaving an empty, unusable UI.
export function setNeedsVerificationHandler(handler) {
  needsVerificationHandler = handler;
}

export async function handleNeedsVerification() {
  if (needsVerificationHandler) await needsVerificationHandler();
}

// Called by the API layer on any 401: drops the stale token and lets App
// route the user back to the auth screens. `failedToken` is the token the
// request actually used: a late 401 for an OLD token must not kill a session
// that has since signed in again.
export async function handleUnauthorized(failedToken) {
  if (failedToken && cached && failedToken !== cached) return;
  if (cached || loaded) await setToken(null);
  if (sessionExpiredHandler) sessionExpiredHandler();
}
