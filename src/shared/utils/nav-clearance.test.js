const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

/* global __dirname:readonly */

function read(rel) {
  return fs.readFileSync(path.join(__dirname, '..', '..', rel), 'utf8');
}

// RED: Progress bottom content hides behind the tab bar on device because
// the clearance was never measured — navHeight stays 0 forever:
// BottomNav never reports its height, and the sheets/screens that accept
// bottomOffset receive nothing.
describe('tab-bar clearance (measured, not assumed)', () => {
  it('BottomNav reports its measured height via onHeight', () => {
    const nav = read('shared/components/ui/BottomNav.js');
    assert.match(nav, /onLayout/, 'BottomNav never measures itself (no onLayout)');
    assert.match(nav, /onHeight/, 'BottomNav has no onHeight callback to report its height');
  });

  it('tab layout feeds the measured height into navHeight state', () => {
    const layout = read('app/(tabs)/_layout.js');
    assert.match(layout, /onHeight=\{/, 'layout never passes onHeight to BottomNav');
    assert.match(
      layout,
      /setNavHeight\(\s*\(?prev\)?\s*=>|setNavHeight\(h\)|setNavHeight\(height\)/,
      'measured height never reaches setNavHeight'
    );
  });

  it('overlay sheets clear the tab bar (offset or full-screen Modal)', () => {
    const layout = read('app/(tabs)/_layout.js');
    assert.match(
      layout,
      /bottomOffset=\{navHeight\}/,
      'QuickLogSheet must get bottomOffset={navHeight}'
    );
    // WeightLogSheet renders in a full-screen Modal (same pattern as
    // FoodDetailSheet), which overlays the tab bar by construction — so it
    // must either take bottomOffset or be Modal-based with safe-area padding.
    const sheet = read('shared/components/WeightLogSheet.js');
    const takesOffset = /bottomOffset/.test(sheet);
    const isModal = /<Modal[\s>]/.test(sheet) && /useSafeAreaInsets/.test(sheet);
    assert.ok(
      takesOffset || isModal,
      'WeightLogSheet must clear the tab bar via bottomOffset or a full-screen Modal'
    );
  });

  it('ProgressScreen bottom padding accounts for the tab bar', () => {
    const screen = read('features/progress/screens/ProgressScreen.js');
    assert.match(
      screen,
      /paddingBottom:\s*32\s*\+\s*\(bottomOffset\s*\|\|\s*0\)/,
      'ProgressScreen must pad content by the measured tab height'
    );
  });
});
