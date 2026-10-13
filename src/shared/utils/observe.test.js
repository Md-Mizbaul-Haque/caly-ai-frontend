const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

/* global __dirname:readonly */

function readRoot(rel) {
  return fs.readFileSync(path.join(__dirname, '..', '..', '..', rel), 'utf8');
}

function walkJs(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules') continue;
      walkJs(p, out);
    } else if (/\.(js|tsx?)$/.test(e.name)) {
      out.push(p);
    }
  }
  return out;
}

// Expo Go compat: expo-observe ships custom native code ("not available in
// Expo Go" per Expo docs) and its root-layout import redboxes the app on
// launch with "Cannot find native module 'ExpoAppMetrics'". Nothing in src
// may import it until the team switches to dev builds.
describe('expo go compat (no custom-native imports)', () => {
  it('no source file imports expo-observe', () => {
    const srcDir = path.join(__dirname, '..', '..');
    const offenders = walkJs(srcDir).filter((f) => /from ['"]expo-observe['"]/.test(fs.readFileSync(f, 'utf8')));
    assert.deepEqual(
      offenders.map((f) => path.relative(srcDir, f)),
      [],
      'expo-observe import crashes Expo Go at startup',
    );
  });

  it('expo-observe is not a dependency', () => {
    const pkg = JSON.parse(readRoot('package.json'));
    assert.equal(pkg.dependencies?.['expo-observe'], undefined, 'dep reinstalls the crash on next install');
  });

  it('production build still uploads source maps for symbolicated stacks', () => {
    const eas = JSON.parse(readRoot('eas.json'));
    assert.equal(eas.build.production.uploadSourceMaps, true, 'release stacks show minified positions instead of source');
  });
});
