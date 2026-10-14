import { authedFetch } from './api';
import { buildMultipartPayload } from './uploadPart';
import { File as FilesystemFile } from 'expo-file-system';

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
  // Manual multipart body (raw bytes + explicit boundary Content-Type):
  // the fetch serializer drops the filename for non-global Blobs, and
  // multer only creates req.file for parts WITH a filename.
  const { body, contentType } = await buildMultipartPayload(imageUri, {
    signal,
    FileSystemFileImpl: FilesystemFile,
  });
  // The Content-Type MUST carry our boundary — fetch cannot infer one for
  // raw bytes (the old "never set Content-Type" rule applied to FormData).
  const fetchFn = () => authedFetch('/api/scan', { method: 'POST', headers: { 'Content-Type': contentType }, body, timeoutMs: 60000, signal });
  
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
    httpErr.data = data;
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
  // Same manual multipart uploader as scanImage (see above for why).
  const { body, contentType } = await buildMultipartPayload(imageUri, {
    signal,
    FileSystemFileImpl: FilesystemFile,
  });
  const fetchFn = () => authedFetch('/api/scan/image', { method: 'POST', headers: { 'Content-Type': contentType }, body, timeoutMs: 30000, signal });
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
    httpErr.data = data;
    throw httpErr;
  }
  return data; // { item }
}
