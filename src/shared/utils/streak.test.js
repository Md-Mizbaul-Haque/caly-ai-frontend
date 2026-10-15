const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { calcStreak, shiftDayKey, buildWeekStrip } = require('./streak');

describe('streak helper (Day Streak card)', () => {
  it('counts consecutive days ending today', () => {
    const logged = new Set(['2026-10-13', '2026-10-14', '2026-10-15']);
    assert.equal(calcStreak(logged, '2026-10-15'), 3);
  });

  it('gives grace when today is unlogged (starts from yesterday)', () => {
    const logged = new Set(['2026-10-13', '2026-10-14']);
    assert.equal(calcStreak(logged, '2026-10-15'), 2);
  });

  it('breaks on a gap (does not skip missing days)', () => {
    const logged = new Set(['2026-10-12', '2026-10-14', '2026-10-15']);
    assert.equal(calcStreak(logged, '2026-10-15'), 2);
  });

  it('returns 0 when neither today nor yesterday logged', () => {
    const logged = new Set(['2026-10-10']);
    assert.equal(calcStreak(logged, '2026-10-15'), 0);
  });

  it('shiftDayKey steps calendar days without DST drift', () => {
    assert.equal(shiftDayKey('2026-10-15', -1), '2026-10-14');
    assert.equal(shiftDayKey('2026-03-09', -1), '2026-03-08');
    assert.equal(shiftDayKey('2026-01-01', 1), '2026-01-02');
    assert.equal(shiftDayKey('', -1), '');
  });

  it('week strip marks logged days + today', () => {
    const days = buildWeekStrip({
      sundayKey: '2026-10-11',
      todayKey: '2026-10-15',
      logged: new Set(['2026-10-13', '2026-10-15']),
      labels: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
    });
    assert.equal(days.length, 7);
    assert.equal(days[0].key, '2026-10-11');
    assert.equal(days[2].logged, true);
    assert.equal(days[4].logged, true);
    assert.equal(days[4].isToday, true);
    assert.equal(days[5].logged, false);
  });
});
