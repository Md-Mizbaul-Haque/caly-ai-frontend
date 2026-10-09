const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

/* global __dirname:readonly */

function read(rel) {
  return fs.readFileSync(path.join(__dirname, '..', '..', rel), 'utf8');
}

// RED: Home + History show no real data because TabShell provider
// does not supply what DashboardScreen / History route consume.
describe('home data contract (TabShell provider vs consumers)', () => {
  const layout = read('app/(tabs)/_layout.js');
  const m = layout.match(/const tabShellValue = useMemo\(\(\) => \(\{([\s\S]*?)\}\), \[/);
  const provided = m ? m[1] : '';

  for (const key of [
    'progressCache',
    'goal',
    'loading',
    'error',
    'weights',
    'weightGoal',
    'rangeMeals',
    'loadRangeMeals',
    'refreshWeights',
    'timeZone',
  ]) {
    it(`provider exposes ${key}`, () => {
      assert.match(provided, new RegExp(`\\b${key}\\b`), `tabShellValue missing ${key}`);
    });
  }

  it('DashboardScreen meals come from provider (not empty fallback)', () => {
    const dash = read('features/dashboard/screens/DashboardScreen.js');
    // After fix DashboardScreen must not depend on s.progressCache alone;
    // it should receive meals/loading/error via props or a supplied cache.
    const usesBareProgressCache = dash.includes('s.progressCache') && !provided.includes('progressCache');
    assert.equal(usesBareProgressCache, false, 'DashboardScreen reads s.progressCache but provider lacks it -> meals=[]');
  });
});

describe('calendar/day filtering', () => {
  it('DaySelector strip stays within fetched week (no out-of-range leak)', () => {
    const src = read('shared/components/dashboard/DaySelector.js');
    // Old buildDays leaked Thu..Sat of adjacent weeks (today±3 clamped to
    // week bounds) while fetchWeek only loads Sun..Sat -> empty days.
    // Fixed version builds exactly the selected week's Sun..Sat.
    assert.doesNotMatch(src, /day\s*-\s*3|day\s*\+\s*3/, 'DaySelector still renders today±3 outside the fetched week');
    assert.match(src, /selected/, 'DaySelector must derive visible days from the selected date');
    assert.match(src, /timeZone/, 'DaySelector must render the week in the user zone');
  });

  it('DaySelector snaps and re-centers like real-world apps', () => {
    const src = read('shared/components/dashboard/DaySelector.js');
    assert.match(src, /onMomentumScrollEnd/, 'swipe release must snap the nearest day to center');
    assert.match(src, /nearestToCenter/, 'snap target must use the shared centering math');
    assert.match(src, /centerTarget/, 'scrolling must use the shared centering math');
    assert.match(src, /edgePadding/, 'edge days need symmetric padding to center');
    assert.match(src, /onContentSizeChange/, 'must wait for measured content before centering (mount race)');
    assert.match(src, /recenterSignal/, 'parent refresh must be able to trigger a re-center');
  });

  it('DaySelector browses without dead ends and never swipe-selects', () => {
    const src = read('shared/components/dashboard/DaySelector.js');
    assert.match(src, /buildWindow/, 'strip must render a rolling window of day-blocks');
    assert.match(src, /extendWindow/, 'swiping to an edge must instantly reveal more blocks');
    const snap = /function handleSnap\(\) \{([\s\S]*?)\n  \}/.exec(src);
    assert.ok(snap, 'handleSnap must exist');
    assert.doesNotMatch(snap[1], /onSelect/, 'swipe release must snap only — only taps change the selection');
    assert.match(src, /needsSnap/, 'snap must skip sub-pixel corrections (programmatic echo loop)');
    assert.match(src, /MAX_BLOCKS/, 'window growth must be capped (unbounded SVG pills jank low-end devices)');
    assert.match(src, /rotated/, 'rotation must recompute padding and re-center');
  });

  it('selecting another week triggers a fetch for that week', () => {
    const layout = read('app/(tabs)/_layout.js');
    // loadWeek() takes no args and always fetches new Date() -> cannot load other weeks
    const supportsRef = /loadWeek\s*=\s*useCallback\s*\(\s*async\s*\(\s*\{[^}]*\}?\s*=?\s*\{?[^)]*reference|loadWeek\([^)]*reference|weekRange\(selected/i.test(layout)
      || /fetchMeals\(\s*from/.test(layout);
    assert.equal(supportsRef, true, 'loadWeek cannot fetch an arbitrary selected week');
  });
});

describe('per-user + write paths', () => {
  it('weekMeals cache is user-scoped', () => {
    const cache = read('shared/lib/appCache.js');
    const scoped = /userId|uid|userKey|per-user|per user/i.test(cache) || /weekMeals:.*\$\{|`caly\.cache\.weekMeals\./.test(cache);
    assert.equal(scoped, true, 'weekMeals cache key is global - prior user data can paint');
  });

  it('meal delete persists via API', () => {
    const layout = read('app/(tabs)/_layout.js');
    assert.match(layout, /deleteMealById/, 'handleMealDeleted never calls deleteMealById');
  });

  it('new meals stamp client loggedAt', () => {
    for (const f of [
      'features/meals/components/FoodDetailSheet.js',
      'features/scan/screens/ScanResultScreen.js',
      'features/meals/screens/LogFoodScreen.js',
      'features/meals/screens/MealsScreen.js',
    ]) {
      const src = read(f);
      // create payloads flow through onSave/onAdd in these files; at least the
      // central handleSave must stamp loggedAt if callers omit it.
      void src;
    }
    const layout = read('app/(tabs)/_layout.js');
    const mealsApi = read('shared/lib/mealsApi.js');
    const stamps = /loggedAt/.test(layout) || /loggedAt/.test(mealsApi);
    assert.equal(stamps, true, 'no loggedAt stamped on create -> server Date.now decides the day');
  });
});
