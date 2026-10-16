import { apiGet, apiPost, apiPut } from './api';
import { setToken } from './tokenStore';

// Every function throws Error with the server's message (err.status available)
// and stores the JWT on any token-bearing response.

export async function register(name, email, password) {
  const data = await apiPost('/api/auth/register', { name, email, password });
  // No-SMTP auto-verify mode returns a session directly instead of a code.
  if (data.token) await setToken(data.token);
  return data;
}

export async function login(email, password) {
  try {
    const data = await apiPost('/api/auth/login', { email, password });
    await setToken(data.token);
    return data; // { token, user }
  } catch (err) {
    if (err.status === 403 && err.data && err.data.needsVerification) {
      err.needsVerification = true;
    }
    throw err;
  }
}

export async function verifyEmail(email, code) {
  const data = await apiPost('/api/auth/verify-email', { email, code });
  await setToken(data.token);
  return data; // { token, user }
}

export async function resendCode(email) {
  const data = await apiPost('/api/auth/resend-code', { email });
  // No-SMTP auto-verify mode materializes the session here instead of a code.
  if (data.token) await setToken(data.token);
  return data;
}

export async function skipVerification(email) {
  const data = await apiPost('/api/auth/skip-verification', { email });
  await setToken(data.token);
  return data; // { token, user }
}

export async function forgotPassword(email) {
  return apiPost('/api/auth/forgot-password', { email });
}

export async function resetPassword(email, code, newPassword) {
  const data = await apiPost('/api/auth/reset-password', { email, code, newPassword });
  await setToken(data.token);
  return data; // { token, user }
}

export async function fetchMe() {
  return apiGet('/api/auth/me'); // { user }
}

export async function updateProfile(partial) {
  return apiPut('/api/auth/profile', partial); // { user }
}

export async function logout() {
  // Best-effort server revoke (bumps the token version) so a copied token
  // stops working; local token is cleared regardless.
  try {
    await apiPost('/api/auth/logout', {});
  } catch {
    // already invalid / offline — clearing locally is enough
  }
  await setToken(null);
}
