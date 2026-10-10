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
    assert.match(screen, /startsWith\('file:'\)/, 'only native file URIs go up for storage');
  });

  it('scan items show their pictured serving', () => {
    const screen = read('features/scan/screens/ScanResultScreen.js');
    assert.match(screen, /item\.serving/, 'photo kcal without a portion misleads the diary');
  });

  it('gallery pick handles denial instead of rejecting', () => {
    const upload = read('features/scan/screens/PictureUploadScreen.js');
    const fn = /pickFromLibrary[\s\S]{0,600}/.exec(upload);
    assert.ok(fn, 'pickFromLibrary missing');
    assert.match(fn[0], /try/, 'launchImageLibraryAsync outside try/catch');
  });
});
