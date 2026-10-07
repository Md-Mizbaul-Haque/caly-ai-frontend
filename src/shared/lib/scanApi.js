import { authedFetch } from './api';

/**
 * POST /api/scan — multipart photo upload, returns { items: [{name,kcal,protein,carbs,fat}] }
 * Falls back to a placeholder estimate when the backend has no OPENAI_API_KEY
 * (503) so the log-a-meal flow always completes.
 */
export async function scanImage(imageUri) {
  const form = new FormData();
  form.append('image', { uri: imageUri, name: 'meal.jpg', type: 'image/jpeg' });
  // Photo upload + AI inference can exceed the default 15 s timeout on 4G.
  const res = await authedFetch('/api/scan', { method: 'POST', body: form, timeoutMs: 60000 });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 503) {
      return {
        items: [{ name: 'Scanned meal', kcal: 400, protein: 15, carbs: 40, fat: 15 }],
        placeholder: true,
      };
    }
    if (res.status === 422) {
      throw new Error('No food detected in this photo — try again with the meal filling the frame.');
    }
    throw new Error(data.error || `scan failed: ${res.status}`);
  }
  return data; // { items }
}

/**
 * GET /api/barcode/:code — returns { item: {name,kcal,protein,carbs,fat} }
 */
export async function lookupBarcode(code) {
  // OpenFoodFacts lookup can be slow on mobile networks.
  const res = await authedFetch(`/api/scan/barcode/${encodeURIComponent(code)}`, { timeoutMs: 30000 });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `barcode lookup failed: ${res.status}`);
  return data; // { item }
}
