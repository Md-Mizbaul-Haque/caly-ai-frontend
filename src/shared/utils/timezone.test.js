const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const F = require('./format');
// Pure date math lives in mealDates (dependency-free) so node --test can
// load it; mealsApi re-exports the same functions for the app.
const M = require('./mealDates');

describe('frontend timezone helpers (per-user zone, UTC fallback)', () => {
  it('dateKey keys the same instant differently per zone', () => {
    const instant = new Date('2026-10-09T18:30:00.000Z');
    assert.equal(F.dateKey(instant, 'UTC'), '2026-10-09');
    assert.equal(F.dateKey(instant, 'Asia/Dhaka'), '2026-10-10');
  });
  it('dateKey without a zone keeps device-local behavior', () => {
    const d = new Date(2026, 9, 9, 12, 0, 0);
    assert.equal(F.dateKey(d), '2026-10-09');
  });
  it('resolveTimeZone falls back to UTC for anything unusable', () => {
    assert.equal(F.resolveTimeZone('Asia/Dhaka'), 'Asia/Dhaka');
    assert.equal(F.resolveTimeZone('Bogus/Zone'), 'UTC');
    assert.equal(F.resolveTimeZone(undefined), 'UTC');
    assert.equal(F.resolveTimeZone(''), 'UTC');
  });
  it('deviceTimeZone returns a usable zone (never throws)', () => {
    const tz = F.deviceTimeZone();
    assert.equal(typeof tz, 'string');
    assert.ok(tz.length > 0);
    assert.equal(F.resolveTimeZone(tz), tz);
  });
  it('effectiveTimeZone prefers the stored user zone, else the device zone', () => {
    assert.equal(F.effectiveTimeZone({ timezone: 'Asia/Dhaka' }), 'Asia/Dhaka');
    assert.equal(F.effectiveTimeZone({ timezone: 'Bogus/Zone' }), F.deviceTimeZone());
    assert.equal(F.effectiveTimeZone(null), F.deviceTimeZone());
  });
});

describe('weekRange in a user zone', () => {
  it('spans the Sun..Sat week containing the zoned day', () => {
    // 2026-10-09T18:30Z is Friday Oct 9 in UTC but Saturday Oct 10 in Dhaka.
    const instant = new Date('2026-10-09T18:30:00.000Z');
    const utc = M.weekRange(instant, 'UTC');
    assert.deepEqual(utc, { from: '2026-10-04', to: '2026-10-10' });
    const dhaka = M.weekRange(instant, 'Asia/Dhaka');
    assert.deepEqual(dhaka, { from: '2026-10-04', to: '2026-10-10' });
    // A Sunday-edge instant: 2026-10-04T00:30+06:00 == Oct 3 18:30Z (Saturday UTC).
    const edge = new Date('2026-10-03T18:30:00.000Z');
    assert.deepEqual(M.weekRange(edge, 'UTC'), { from: '2026-09-27', to: '2026-10-03' });
    assert.deepEqual(M.weekRange(edge, 'Asia/Dhaka'), { from: '2026-10-04', to: '2026-10-10' });
  });
});

describe('meals query carries the user zone', () => {
  it('buildMealsPath includes tz=', () => {
    const p = M.buildMealsPath('2026-10-04', '2026-10-10', undefined, 'Asia/Dhaka');
    assert.ok(p.includes('from=2026-10-04'), p);
    assert.ok(p.includes('to=2026-10-10'), p);
    assert.ok(p.includes('tz=Asia%2FDhaka'), p);
  });
  it('defaults tz to UTC when unset', () => {
    const p = M.buildMealsPath('2026-10-04', '2026-10-10');
    assert.ok(p.includes('tz=UTC'), p);
  });
});
