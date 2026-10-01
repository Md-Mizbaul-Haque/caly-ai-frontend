import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'caly-auth-token';

let cached = null;
let loaded = false;
let sessionExpiredHandler = null;

export async function getToken() {
  if (loaded) return cached;
  cached = await SecureStore.getItemAsync(TOKEN_KEY).catch(() => null);
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

// Called by the API layer on any 401: drops the stale token and lets App
// route the user back to the auth screens.
export async function handleUnauthorized() {
  if (cached || loaded) await setToken(null);
  if (sessionExpiredHandler) sessionExpiredHandler();
}
