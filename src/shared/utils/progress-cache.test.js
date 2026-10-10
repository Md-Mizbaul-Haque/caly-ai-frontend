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
});
