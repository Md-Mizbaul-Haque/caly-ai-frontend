import { authedFetch } from './api';

/**
 * Retry a fetch function on network errors.
 * @param {() => Promise<any>} fetchFn - The function that performs the fetch.
 * @param {number} maxRetries - Maximum number of retry attempts.
 * @param {number} retryDelay - Delay between retries in milliseconds.
 * @returns {Promise<any>}
 */
async function fetchWithRetry(fetchFn, maxRetries = 2, retryDelay = 1000, signal) {
  let lastError;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fetchFn();
    } catch (error) {
      lastError = error;
      // A caller abort is intentional — never retry it.
      if (signal?.aborted) {
        throw error;
      }
      // Only retry on network errors (as defined in api.js: connectionError sets error.network = true)
      if (!error.network) {
        throw error;
      }
      // If we have retries left, wait and try again
      if (i < maxRetries) {
        console.warn(`[scanApi] Network error, retrying (${i + 1}/${maxRetries}):`, error.message);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }
  throw lastError;
}

/**
 * POST /api/scan — multipart photo upload, returns { items: [{name,kcal,protein,carbs,fat}] }
 * Falls back to a placeholder estimate when the backend has no OPENAI_API_KEY
 * (503) so the log-a-meal flow always completes.
 */
export async function scanImage(imageUri, { signal } = {}) {
  const form = new FormData();
  // Web gallery URIs are blob:/data: URLs — the {uri,name,type} shape only
  // uploads on native. Resolve to a real File first so web uploads bytes.
  let file = { uri: imageUri, name: 'meal.jpg', type: 'image/jpeg' };
  if (typeof imageUri === 'string' && /^(blob|data):/.test(imageUri)) {
    const blob = await (await fetch(imageUri, { signal })).blob();
    file = new File([blob], 'meal.jpg', { type: blob.type || 'image/jpeg' });
  }
  form.append('image', file);
  // Photo upload + AI inference can exceed the default 15 s timeout on 4G.
  const fetchFn = () => authedFetch('/api/scan', { method: 'POST', body: form, timeoutMs: 60000, signal });
  let res;
  try {
    res = await fetchWithRetry(fetchFn, 2, 1000, signal);
  } catch (error) {
    // If we exhausted retries, throw the last error
    throw error;
  }
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
    // Map known backend error messages to user-friendly ones
    let errorMessage = data.error || `scan failed: ${res.status}`;
    if (errorMessage && errorMessage.includes('model does not support image input')) {
      errorMessage = 'The image format is not supported. Please try a different image or format.';
    } else if (errorMessage && errorMessage.includes('Cannot read')) {
      errorMessage = 'Unable to process the image. Please ensure the image is clear and try again.';
    }
    throw new Error(errorMessage);
  }
  return data; // { items }
}

/**
 * POST /api/scan/image — persist a KEPT meal photo to Cloudinary.
 * Called once at Save (never for discarded scans) -> { imageUrl }.
 */
export async function uploadMealImage(imageUri, { signal } = {}) {
  const form = new FormData();
  form.append('image', { uri: imageUri, name: 'meal.jpg', type: 'image/jpeg' });
  const res = await authedFetch('/api/scan/image', { method: 'POST', body: form, timeoutMs: 30000, signal });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `photo upload failed: ${res.status}`);
  }
  return data; // { imageUrl }
}

/**
 * GET /api/barcode/:code — returns { item: {name,kcal,protein,carbs,fat} }
 */
export async function lookupBarcode(code, { signal } = {}) {
  const fetchFn = () => authedFetch(`/api/scan/barcode/${encodeURIComponent(code)}`, { timeoutMs: 30000, signal });
  let res;
  try {
    res = await fetchWithRetry(fetchFn, 2, 1000, signal);
  } catch (error) {
    throw error;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Map known backend error messages to user-friendly ones
    let errorMessage = data.error || `barcode lookup failed: ${res.status}`;
    if (errorMessage && errorMessage.includes('model does not support image input')) {
      errorMessage = 'The image format is not supported. Please try a different image or format.';
    } else if (errorMessage && errorMessage.includes('Cannot read')) {
      errorMessage = 'Unable to process the image. Please ensure the image is clear and try again.';
    }
    throw new Error(errorMessage);
  }
  return data; // { item }
}
