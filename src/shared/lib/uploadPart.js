// Upload-part builder shared by scanImage + uploadMealImage.
//
// CJS on purpose: plain node can require it (platform deps are injected,
// never imported here), so the branching logic has real unit tests in
// upload-part.test.js. Callers pass the real expo modules; tests pass fakes.
function isWebUri(uri) {
  return typeof uri === 'string' && /^(blob|data):/.test(uri);
}

/**
 * Build a FormData part holding REAL bytes for any photo URI.
 * Expo WinterCG fetch (SDK 57+, every platform) serializes only
 * string / Blob / .bytes() parts — appending a React Native
 * {uri, name, type} object throws "Unsupported FormDataPart
 * implementation", so native file:// URIs must be read to bytes first.
 */
async function buildUploadPart(
  imageUri,
  { signal, fetchImpl, FileImpl, FileSystemFileImpl, BlobImpl } = {}
) {
  if (isWebUri(imageUri)) {
    // Web gallery URIs are blob:/data: URLs — resolve to real bytes first.
    const FileCtor = FileImpl || File;
    const fetchFn = fetchImpl || fetch;
    const blob = await (await fetchFn(imageUri, { signal })).blob();
    return new FileCtor([blob], 'meal.jpg', { type: blob.type || 'image/jpeg' });
  }
  // Native file:// URIs: read bytes via expo-file-system's File (.bytes()
  // is also directly accepted by the fetch serializer) and wrap them in
  // an expo-blob Blob — RN's Blob cannot hold JS binary data.
  const bytes = await new FileSystemFileImpl(imageUri).bytes();
  return new BlobImpl([bytes], { type: 'image/jpeg' });
}

module.exports = { isWebUri, buildUploadPart };
