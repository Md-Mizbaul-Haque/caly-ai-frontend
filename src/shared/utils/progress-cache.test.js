const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

/* global __dirname:readonly */

function read(rel) {
  return fs.readFileSync(path.join(__dirname, '..', '..', rel), 'utf8');
}

// Progress block must paint instantly with no reload flash: the
// long-horizon meals backing streak + daily-average are persisted like
// every other Progress input, and ALL truly covers full history.
describe('progress block cache + ALL coverage', () => {
  it('layout persists rangeMeals to the per-user cache', () => {
    const layout = read('app/(tabs)/_layout.js');
    assert.match(layout, /writeCache\(scopedKey\('rangeMeals'/, 'rangeMeals never written to cache -> cold start flashes streak/average');
  });

  it('layout hydrates rangeMeals from cache on login', () => {
    const layout = read('app/(tabs)/_layout.js');
    assert.match(layout, /rangeMealsResult|readCacheWithTimestamp\(scopedKey\('rangeMeals'/, 'rangeMeals never read back from cache');
  });

  it('rangeMeals cache has a TTL entry', () => {
    const cache = read('shared/lib/appCache.js');
    assert.match(cache, /rangeMeals/, 'no rangeMeals TTL -> freshness checks treat it as always stale');
  });

  it('ALL range extends the meals horizon to the first log', () => {
    const progress = read('features/progress/screens/ProgressScreen.js');
    assert.match(progress, /ALL/, 'no ALL handling in ProgressScreen');
    assert.match(progress, /1825|first log|earliest/i, 'ALL meals still capped at 365d while weights span all time');
  });

  it('history retry refreshes weights too, not just the week', () => {
    const history = read('app/(tabs)/history.js');
    assert.match(history, /onRetry=\{\(\) =>/, 'Retry only reloads the week -> failed weights stay failed');
  });

  it('cache persists are owner-guarded (no cross-account paint on switch)', () => {
    const layout = read('app/(tabs)/_layout.js');
    assert.match(layout, /!== userKey\)\) return;/, 'persist effects run before hydration clears state -> old owner data filed under the new key');
  });

  it('history wires onLoadWeek so Progress focus can revalidate today (no stale streak)', () => {
    const history = read('app/(tabs)/history.js');
    assert.match(history, /onLoadWeek/, 'Progress never refreshes its week on focus -> cross-device logs leave the streak stale');
  });

  it('progress focus silently reloads today\'s week for the streak', () => {
    const progress = read('features/progress/screens/ProgressScreen.js');
    assert.match(progress, /onLoadWeek\?\.\(\{ reference: new Date\(\), silent: true \}\)/, 'focus skips the week fetch -> streak misses logs made on other devices');
  });

  it('progress pull-to-refresh includes today\'s week (not just the selected week)', () => {
    const progress = read('features/progress/screens/ProgressScreen.js');
    assert.match(progress, /handleRefresh[\s\S]*onLoadWeek/, 'refresh only reloads the selected week -> streak stays stale after Dashboard week navigation');
  });

  it('streak math is pure + calendar-safe (no UTC-noon drift in extreme zones)', () => {
    const progress = read('features/progress/screens/ProgressScreen.js');
    assert.match(progress, /calcStreak|buildWeekStrip/, 'inline streak loop regressed -> extreme-zone (UTC+13/+14) drift returns');
  });

  it('range horizon guard is tz-keyed with zoned start (travelers keep correct streak)', () => {
    const layout = read('app/(tabs)/_layout.js');
    assert.match(layout, /curTz/, 'bare-from guard reuses one zone\'s window for another after travel -> streak boundary days misattribute');
    assert.match(layout, /shiftDayKey\(todayKey/, 'device-local horizon start drifts a day when device zone != user zone');
  });

  it('history passes the profile user so Progress can compute BMI', () => {
    const history = read('app/(tabs)/history.js');
    assert.match(history, /user=\{s\.user\}/, 'BMI has no height/profile weight -> card can never compute');
  });

  it('progress BMI card shows advice + update-goal action (no dead card)', () => {
    const progress = read('features/progress/screens/ProgressScreen.js');
    assert.match(progress, /Your BMI/, 'no BMI card on the Progress screen');
    assert.match(progress, /Update weight goal/, 'BMI card has no goal action -> user cannot act on the advice');
    assert.match(progress, /BMI_DISCLAIMER|not medical advice/i, 'health advice without a medical disclaimer');
  });
});
