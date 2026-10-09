const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const C = require('./mealDates');

describe('edgePadding (so first/last days can center)', () => {
  it('is half the leftover space around the item', () => {
    assert.equal(C.edgePadding(390, 60), 165);
  });
  it('is 0 when the item fills the viewport', () => {
    assert.equal(C.edgePadding(390, 400), 0);
    assert.equal(C.edgePadding(390, 390), 0);
  });
});

describe('centerTarget (scroll x that centers the item)', () => {
  it('centers a middle item exactly', () => {
    // item at x=200 w=60 in a 390 viewport, no padding, plenty of content.
    assert.equal(C.centerTarget(200, 60, 390, 0, 1000), 35);
  });
  it('clamps the first item to 0 without padding', () => {
    assert.equal(C.centerTarget(0, 60, 390, 0, 1000), 0);
  });
  it('scrolls exactly to the item start when edge padding is applied', () => {
    // pad = 390/2 - 60/2 = 165: item center + pad lands on viewport center
    // precisely when scroll x equals the item x.
    assert.equal(C.centerTarget(0, 60, 390, 165, 1000), 0);
    assert.equal(C.centerTarget(420, 60, 390, 165, 1000), 420);
  });
  it('clamps the last item to maxScroll without padding', () => {
    // raw target 800+30-195=635 exceeds maxScroll 610 -> clamped.
    assert.equal(C.centerTarget(800, 60, 390, 0, 1000), 610);
  });
  it('never goes negative and never exceeds maxScroll', () => {
    assert.equal(C.centerTarget(0, 10, 390, 0, 200), 0);
    assert.equal(C.centerTarget(5000, 60, 390, 0, 1000), 610);
  });
});

describe('nearestToCenter (snap target on swipe release)', () => {
  // 7 pills, 8px gaps, first three narrow (52), selected wide (76).
  const layouts = [
    { key: 'sun', x: 0, w: 52 },
    { key: 'mon', x: 60, w: 52 },
    { key: 'tue', x: 120, w: 52 },
    { key: 'wed', x: 180, w: 76 },
    { key: 'thu', x: 264, w: 52 },
    { key: 'fri', x: 324, w: 52 },
    { key: 'sat', x: 384, w: 52 },
  ];
  it('picks the item whose center is closest to the viewport center', () => {
    // scrollX=0, viewport 390 -> center at 195; wed spans 180..256 (center 218).
    assert.equal(C.nearestToCenter(layouts, 0, 390, 0), 'wed');
    // scrolled right: center at 419; sat spans 384..436 (center 410).
    assert.equal(C.nearestToCenter(layouts, 224, 390, 0), 'sat');
  });
  it('accounts for leading edge padding', () => {
    // pad 165 shifts every center +165: viewport center 195 hits mon (60+26+165=251)? no:
    // sun 0+26+165=191 -> closest to 195 is sun.
    assert.equal(C.nearestToCenter(layouts, 0, 390, 165), 'sun');
  });
  it('returns null for an empty strip', () => {
    assert.equal(C.nearestToCenter([], 0, 390, 0), null);
  });
  it('prefers the earlier item on an exact tie', () => {
    const tied = [
      { key: 'a', x: 0, w: 100 },
      { key: 'b', x: 100, w: 100 },
    ];
    // viewport center at 100: a center 50 (dist 50), b center 150 (dist 50).
    assert.equal(C.nearestToCenter(tied, 0, 200, 0), 'a');
  });
});

describe('needsSnap (jitter-loop guard)', () => {
  it('skips the scroll when already centered within 1px', () => {
    assert.equal(C.needsSnap(100, 100.4), false);
    assert.equal(C.needsSnap(100, 99.2), false);
  });
  it('scrolls when visibly off-center', () => {
    assert.equal(C.needsSnap(100, 105), true);
    assert.equal(C.needsSnap(100, 0), true);
  });
});

describe('buildWindow (rolling day-blocks around an anchor)', () => {
  it('returns radius days on each side of the anchor, consecutive and keyed', () => {
    const days = C.buildWindow('2026-10-09', 2, 'UTC');
    assert.deepEqual(days.map((d) => d.key), [
      '2026-10-07',
      '2026-10-08',
      '2026-10-09',
      '2026-10-10',
      '2026-10-11',
    ]);
    for (const d of days) assert.ok(d.date instanceof Date, 'each block carries its Date');
  });
  it('keys days in the user zone, not UTC', () => {
    // 2026-10-09T18:30Z is Oct 10 in Dhaka: anchor key must be the zoned day.
    const days = C.buildWindow(new Date('2026-10-09T18:30:00.000Z'), 1, 'Asia/Dhaka');
    assert.deepEqual(days.map((d) => d.key), ['2026-10-09', '2026-10-10', '2026-10-11']);
  });
  it('falls back to UTC for a bad zone and rejects bad anchors', () => {
    assert.deepEqual(C.buildWindow('2026-10-09', 1, 'Nope').map((d) => d.key), [
      '2026-10-08',
      '2026-10-09',
      '2026-10-10',
    ]);
    assert.deepEqual(C.buildWindow('bad-date', 2, 'UTC'), []);
    assert.deepEqual(C.buildWindow('2026-10-09', -1, 'UTC'), []);
  });
});

describe('extendWindow (instant more blocks while swiping)', () => {
  it('appends consecutive blocks after the last day', () => {
    const days = C.buildWindow('2026-10-09', 1, 'UTC');
    const grown = C.extendWindow(days, 'forward', 2, 'UTC');
    assert.deepEqual(grown.map((d) => d.key), [
      '2026-10-08',
      '2026-10-09',
      '2026-10-10',
      '2026-10-11',
      '2026-10-12',
    ]);
  });
  it('prepends consecutive blocks before the first day', () => {
    const days = C.buildWindow('2026-10-09', 1, 'UTC');
    const grown = C.extendWindow(days, 'backward', 2, 'UTC');
    assert.deepEqual(grown.map((d) => d.key), [
      '2026-10-06',
      '2026-10-07',
      '2026-10-08',
      '2026-10-09',
      '2026-10-10',
    ]);
  });
  it('never duplicates keys across month boundaries', () => {
    const days = C.buildWindow('2026-11-01', 1, 'UTC');
    const grown = C.extendWindow(C.extendWindow(days, 'backward', 3, 'UTC'), 'forward', 3, 'UTC');
    const keys = grown.map((d) => d.key);
    assert.equal(new Set(keys).size, keys.length);
    assert.deepEqual(keys, [
      '2026-10-28',
      '2026-10-29',
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
      '2026-11-02',
      '2026-11-03',
      '2026-11-04',
      '2026-11-05',
    ]);
  });
  it('returns the input unchanged for bad direction or empty windows', () => {
    const days = C.buildWindow('2026-10-09', 1, 'UTC');
    assert.equal(C.extendWindow(days, 'sideways', 2, 'UTC'), days);
    assert.deepEqual(C.extendWindow([], 'forward', 2, 'UTC'), []);
  });
});
