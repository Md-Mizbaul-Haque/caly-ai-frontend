// Caly AI API client - point to your backend
// Set EXPO_PUBLIC_API_URL in .env, e.g. http://localhost:5000
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';

export async function apiGet(path) {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}
