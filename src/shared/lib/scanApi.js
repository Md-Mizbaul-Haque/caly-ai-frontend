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
  // Never set Content-Type manually here — fetch generates the multipart
  // boundary; a hardcoded 'multipart/form-data' breaks every native upload.
  // Photo upload + AI inference can exceed the default 15 s timeout on 4G.
  const fetchFn = () => authedFetch('/api/scan', { method: 'POST', body: form, timeoutMs: 60000, signal });
  
  let res;
  try {
    res = await fetchWithRetry(fetchFn, 2, 1000, signal);
  } catch (error) {
    // Log BEFORE throwing — anything after throw never runs.
    console.warn('[scanApi] scanImage retries exhausted:', error?.message || error);
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
      // No food in frame: not a failure — the result sheet opens with
      // zeros and the photo so the user can enter estimates.
      return { items: [], noFood: true };
    }
    // Map known backend error messages to user-friendly ones
    let errorMessage = data.error || `scan failed: ${res.status}`;
    if (errorMessage && errorMessage.includes('model does not support image input')) {
      errorMessage = 'The image format is not supported. Please try a different image or format.';
    } else if (errorMessage && errorMessage.includes('Cannot read')) {
      errorMessage = 'Unable to process the image. Please ensure the image is clear and try again.';
    }
    const httpErr = new Error(errorMessage);
    httpErr.status = res.status;
    httpErr.code = res.status === 401 ? 'UNAUTHORIZED' : 'HTTP_4xx';
    throw httpErr;
  }
  // A 200 without an items array (proxy error page, wrong route) must be
  // diagnosable — never paint an empty success. The server echoes our
  // X-Request-Id, which doubles as the Ref #.
  if (!data || !Array.isArray(data.items)) {
    const bad = new Error(
      `Unexpected server response (Ref #${(res.headers && res.headers.get('X-Request-Id')) || 'n/a'}). Please retry.`
    );
    bad.code = 'BAD_RESPONSE';
    throw bad;
  }
  return data; // { items }
}

/**
 * POST /api/scan/image — persist a KEPT meal photo to Cloudinary.
 * Called once at Save (never for discarded scans) -> { imageUrl }.
 */
export async function uploadMealImage(imageUri, { signal } = {}) {
  const form = new FormData();
  // Never set Content-Type manually — fetch generates the multipart boundary.
  form.append('image', { uri: imageUri, name: 'meal.jpg', type: 'image/jpeg' });
  const fetchFn = () => authedFetch('/api/scan/image', { method: 'POST', body: form, timeoutMs: 30000, signal });
  const res = await fetchWithRetry(fetchFn, 2, 1000, signal);
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
    const httpErr = new Error(errorMessage);
    httpErr.status = res.status;
    httpErr.code = res.status === 401 ? 'UNAUTHORIZED' : res.status >= 500 ? 'HTTP_5xx' : 'HTTP_4xx';
    throw httpErr;
  }
  return data; // { item }
}
