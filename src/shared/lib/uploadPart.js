// Manual multipart builder shared by scanImage + uploadMealImage.
//
// CJS on purpose: plain node can require it (platform deps are injected,
// never imported here), so the wire format has real unit tests in
// multipart.test.js. Callers pass the real expo modules; tests pass fakes.
//
// WHY manual: Expo WinterCG fetch (SDK 57+, every platform) serializes a
// FormData part only as string / Blob / .bytes() — and it drops the
// filename for anything that is not `instanceof` the global Blob. A part
// without `filename=` arrives at multer as a text field, so `req.file` is
// undefined and the server answers 400 "image file required". Assembling
// the RFC 7578 body ourselves (as raw bytes, which is the native currency
// of expo's transport) makes the filename deterministic.
function isWebUri(uri) {
  return typeof uri === 'string' && /^(blob|data):/.test(uri);
}

// ASCII only (boundaries/filenames are ASCII) — no TextEncoder needed,
// which is not guaranteed on Hermes.
function asciiBytes(str) {
  const out = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) out[i] = str.charCodeAt(i) & 0x7f;
  return out;
}

function newMultipartBoundary() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let boundary = '----CalyFormBoundary';
  for (let i = 0; i < 16; i++) boundary += chars.charAt(Math.floor(Math.random() * chars.length));
  return boundary;
}

/**
 * Build an exact RFC 7578 body: headers carry name + filename +
 * content-type, photo bytes embedded verbatim, closing boundary last.
 */
function buildMultipartBody({ field, filename, mime, bytes }, boundary) {
  const b = boundary || newMultipartBoundary();
  const head = asciiBytes(
    `--${b}\r\nContent-Disposition: form-data; name="${field}"; filename="${filename}"\r\nContent-Type: ${mime}\r\n\r\n`
  );
  const tail = asciiBytes(`\r\n--${b}--\r\n`);
  const body = new Uint8Array(head.length + bytes.length + tail.length);
  body.set(head, 0);
  body.set(bytes, head.length);
  body.set(tail, head.length + bytes.length);
  // fetch cannot infer a boundary for raw bytes, so the caller must send
  // this exact Content-Type header with the body.
  return { body, contentType: `multipart/form-data; boundary=${b}`, boundary: b };
}

/** Photo bytes on any platform: web blob:/data: via fetch, native file:// via expo-file-system. */
async function readPhotoBytes(imageUri, { signal, fetchImpl, FileSystemFileImpl } = {}) {
  if (isWebUri(imageUri)) {
    const fetchFn = fetchImpl || fetch;
    const res = await fetchFn(imageUri, { signal });
    return new Uint8Array(await res.arrayBuffer());
  }
  const file = new FileSystemFileImpl(imageUri);
  return new Uint8Array(await file.arrayBuffer());
}

/** One call per upload: bytes + deterministic multipart body for a meal photo. */
async function buildMultipartPayload(imageUri, opts = {}) {
  const bytes = await readPhotoBytes(imageUri, opts);
  return buildMultipartBody(
    { field: 'image', filename: 'meal.jpg', mime: 'image/jpeg', bytes },
    opts.boundary
  );
}

module.exports = { isWebUri, buildMultipartBody, readPhotoBytes, buildMultipartPayload, newMultipartBoundary };
