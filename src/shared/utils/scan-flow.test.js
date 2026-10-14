const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

/* global __dirname:readonly */

function read(rel) {
  return fs.readFileSync(path.join(__dirname, '..', '..', rel), 'utf8');
}

// Scan -> log-meal flow must not dead-navigate, double-post, or crash.
describe('scan flow robustness', () => {
  it('layout does not push the dead /scan/result route (overlay handles it)', () => {
    const layout = read('app/(tabs)/_layout.js');
    assert.doesNotMatch(layout, /\/scan\/result/, 'phantom route push competes with the result overlay');
  });

  it('result screen guards save: no double-post, shows errors', () => {
    const screen = read('features/scan/screens/ScanResultScreen.js');
    assert.match(screen, /saving/, 'no saving state -> double-tap double-posts, failures vanish');
    assert.match(screen, /await onSave/, 'save result is not awaited -> failures are unhandled');
    assert.match(screen, /saveError|Could not save/, 'no save error UI');
  });

  it('result screen survives empty/missing items', () => {
    const screen = read('features/scan/screens/ScanResultScreen.js');
    assert.match(screen, /result\.items \?\? \[\]|filter\(Boolean\)/, 'undefined items crash the list');
  });

  it('barcode unit is surfaced (per-100g vs serving)', () => {
    const screen = read('features/scan/screens/ScanResultScreen.js');
    assert.match(screen, /per 100g|per100g/, 'user cannot tell per-100g values from a serving');
  });

  it('scan requests are cancellable end to end', () => {
    const api = read('shared/lib/api.js');
    const scanApi = read('shared/lib/scanApi.js');
    const upload = read('features/scan/screens/PictureUploadScreen.js');
    assert.match(api, /externalSignal|options\.signal/, 'authedFetch ignores caller abort signals');
    assert.match(scanApi, /signal/, 'scanApi never passes an abort signal');
    assert.match(upload, /Cancel|cancel/, 'scanning overlay has no cancel');
  });

  it('photos are shrunk before upload (no multi-MB stalls)', () => {
    const upload = read('features/scan/screens/PictureUploadScreen.js');
    assert.match(upload, /manipulateAsync/, 'original camera photos upload uncompressed');
    assert.match(upload, /resize/, 'no resize bound on the upload');
  });

  it('web uploads send real bytes, not a stringified object', () => {
    const scanApi = read('shared/lib/scanApi.js');
    assert.match(scanApi, /new File\(/, 'blob:/data: URIs must be resolved to a File before append');
  });

  it('saved meals never carry dead or bloated image URLs', () => {
    const screen = read('features/scan/screens/ScanResultScreen.js');
    assert.match(screen, /uploadMealImage/, 'kept photos must persist via Cloudinary, not local URIs');
    assert.match(screen, /startsWith\('http'\)/, 'only already-remote URLs may skip storage upload');
  });

  it('scan items show their pictured serving', () => {
    const screen = read('features/scan/screens/ScanResultScreen.js');
    assert.match(screen, /item\.serving/, 'photo kcal without a portion misleads the diary');
  });

  it('scan pre-check fails fast on unusable links, not just airplane mode', () => {
    const upload = read('features/scan/screens/PictureUploadScreen.js');
    assert.match(upload, /isInternetReachable/, 'half-dead links sail through into a 60 s timeout + retries');
  });

  it('cold-start timeouts get a wake-up dialog, not a dead-end error', () => {
    const upload = read('features/scan/screens/PictureUploadScreen.js');
    assert.match(upload, /_e\?\.timeout|\.timeout === true/, 'timeout errors must branch to a wake-up message');
    assert.match(upload, /waking up/i, 'no wake-up guidance for idle-server timeouts');
  });

  it('scan failures branch on a taxonomy code, not message sniffing', () => {
    const upload = read('features/scan/screens/PictureUploadScreen.js');
    assert.match(upload, /classifyApiError/, 'dialog must switch on a failure code');
    assert.match(upload, /UNAUTHORIZED/, 'mid-scan 401 must explain the sign-in reroute');
  });

  it('422 opens the result sheet with zeros, not an alert dead end', () => {
    const scanApi = read('shared/lib/scanApi.js');
    assert.match(scanApi, /noFood:\s*true/, '422 must return an empty-items result for the sheet');
    const screen = read('features/scan/screens/ScanResultScreen.js');
    assert.match(screen, /noFood/, 'result screen must handle the no-food result');
  });

  it('wrong-shape 200s throw BAD_RESPONSE instead of painting empty', () => {
    const scanApi = read('shared/lib/scanApi.js');
    assert.match(scanApi, /BAD_RESPONSE/, 'a 200 without items must be diagnosable');
  });

  it('requests carry the Ref # so backend logs correlate', () => {
    const api = read('shared/lib/api.js');
    assert.match(api, /X-Request-Id/, 'client Ref # must travel to the server');
  });

  it('shutter failure shows the real native message, not a generic string', () => {
    const upload = read('features/scan/screens/PictureUploadScreen.js');
    const fn = /const takePicture[\s\S]{0,2600}/.exec(upload);
    assert.ok(fn, 'takePicture missing');
    assert.match(fn[0], /_e\?\.message/, 'native capture reason is discarded');
  });

  it('shutter failure logs camera state for diagnosis', () => {
    const upload = read('features/scan/screens/PictureUploadScreen.js');
    assert.match(upload, /shutter failed/, 'no shutter-failure log line');
    assert.match(upload, /flashOn|cameraReady/, 'log lacks the state that names the cause');
  });

  it('double-tap cannot enter two captures at once', () => {
    const upload = read('features/scan/screens/PictureUploadScreen.js');
    assert.match(upload, /capturing/, 'no in-flight capture guard');
  });

  it('shutter guards a build where capture is missing, with a gallery way out', () => {
    const upload = read('features/scan/screens/PictureUploadScreen.js');
    assert.match(upload, /typeof .*takePictureAsync/, 'calls the method without checking it exists on this build');
    assert.match(upload, /cameraUnavailable|Camera unavailable/, 'no build-mismatch branch');
    assert.match(upload, /pickFromLibrary/, 'camera-error dialog offers no gallery fallback');
  });

  it('meals saved while photo storage is down say so', () => {
    const screen = read('features/scan/screens/ScanResultScreen.js');
    assert.match(screen, /without photo|photoNotice/, 'photo silently dropped at save');
  });

  it('gallery pick handles denial instead of rejecting', () => {
    const upload = read('features/scan/screens/PictureUploadScreen.js');
    const fn = /pickFromLibrary[\s\S]{0,600}/.exec(upload);
    assert.ok(fn, 'pickFromLibrary missing');
    assert.match(fn[0], /try/, 'launchImageLibraryAsync outside try/catch');
  });

  it('api client re-exports every helper the scan screen imports from it', () => {
    const upload = read('features/scan/screens/PictureUploadScreen.js');
    const api = read('shared/lib/api.js');
    const m = /import\s*{([^}]*)}\s*from\s*["'][^"']*shared\/lib\/api["']/.exec(upload);
    assert.ok(m, 'scan screen no longer imports from shared/lib/api');
    const names = m[1].split(',').map((s) => s.trim()).filter(Boolean);
    assert.ok(names.length > 0, 'no named imports found');
    for (const n of names) {
      assert.match(api, new RegExp(`\\b${n}\\b`), `${n} imported by the scan screen but missing from shared/lib/api.js`);
    }
  });

  it('scan success log never calls placeholder as a function', () => {
    const upload = read('features/scan/screens/PictureUploadScreen.js');
    assert.doesNotMatch(upload, /placeholder``/, 'tagged-template call on possibly-undefined placeholder');
  });

  it('empty capture resets busy instead of sticking the shutter', () => {
    const upload = read('features/scan/screens/PictureUploadScreen.js');
    assert.match(upload, /!photo\?\.uri/, 'undefined photo never resets busy');
  });

  it('API_URL trims stray whitespace from EXPO_PUBLIC_API_URL', () => {
    const api = read('shared/lib/api.js');
    assert.match(api, /EXPO_PUBLIC_API_URL[^;]*\.trim\(\)/, 'API_URL must trim the env value so a trailing space cannot poison every URL');
  });

  it('authedFetch flags our own timer abort as timeout (not message sniffing)', () => {
    const api = read('shared/lib/api.js');
    assert.match(api, /didTimeout/, 'timer must set an explicit flag when it fires');
    assert.match(api, /if \(didTimeout\)/, 'abort after our timer fired must be classified as timeout');
  });

  it('genuine connection failures still report UNREACHABLE', () => {
    const api = read('shared/lib/api.js');
    assert.match(api, /UNREACHABLE/, 'non-timeout network failures must keep the UNREACHABLE code');
    assert.match(api, /\.timeout = true/, 'timeout errors must carry timeout=true for the wake-up dialog');
  });
});
