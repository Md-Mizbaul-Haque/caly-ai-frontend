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
    'user',
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
    // The strip renders exactly the Sun..Sat week containing the selection
    // (the same week loadWeek fetches) — never a rolling today±N window.
    assert.doesNotMatch(src, /day\s*-\s*3|day\s*\+\s*3/, 'DaySelector still renders today±3 outside the fetched week');
    assert.doesNotMatch(src, /buildWindow|extendWindow/, 'DaySelector must not render a rolling window outside the fetched week');
    assert.match(src, /weekRange/, 'DaySelector must derive visible days from weekRange (the fetched week)');
    assert.match(src, /selected/, 'DaySelector must derive visible days from the selected date');
    assert.match(src, /timeZone/, 'DaySelector must render the week in the user zone');
  });

  it('DaySelector is tap-only with week nav (no auto behavior)', () => {
    const src = read('shared/components/dashboard/DaySelector.js');
    assert.doesNotMatch(src, /onMomentumScrollEnd/, 'swipe release must not auto-select (tap-only strip)');
    assert.doesNotMatch(src, /nearestToCenter|centerTarget|edgePadding/, 'no auto-centering scroll math (tap-only strip)');
    assert.doesNotMatch(src, /requestCenter|tryCenter|flushPending/, 'no programmatic auto-centering');
    assert.doesNotMatch(src, /handleSnap/, 'no swipe-release auto-select handler');
    assert.match(src, /onPress/, 'day pills must be tappable');
    assert.match(src, /hitSlop/, 'day pills need generous touch targets');
    assert.match(src, /Previous week/, 'strip needs a previous-week button');
    assert.match(src, /Next week/, 'strip needs a next-week button');
    assert.match(src, /onSelect/, 'taps and week nav must call onSelect explicitly');
  });

  it('DaySelector renders exactly the selected week (panels follow taps)', () => {
    const src = read('shared/components/dashboard/DaySelector.js');
    assert.match(src, /weekRange\(/, 'strip must render the week containing the selection');
    assert.match(src, /for \(let i = 0; i < 7/, 'strip must render exactly 7 day pills');
    assert.doesNotMatch(src, /MAX_BLOCKS/, 'no unbounded window growth (fixed 7 pills)');
    assert.doesNotMatch(src, /retainedStrip/, 'no retained scroll state across unmounts (fixed week rebuilds)');
    assert.match(src, /totalsByDate\[key\]/, 'each pill must read its own day total (no cross-day leak)');
  });

  it('home strip rings cover past days (trailing horizon merged, title follows selection)', () => {
    const dash = read('features/dashboard/screens/DashboardScreen.js');
    assert.match(dash, /loadRangeMeals\?*\.\(14\)/, 'dashboard must prefetch the trailing 14 days for past-day rings');
    assert.match(dash, /rangeMeals/, 'totalsByDate must merge the horizon so past pills paint real rings');
    assert.match(dash, /byId/, 'week/horizon overlap must dedupe by id (no double-count)');
    assert.doesNotMatch(dash, /\{"Today's Meals"\}/, 'meal list title must follow the selected day, not hard-code today');
  });

  it('home shows a whole-screen skeleton while first loading (no spinner)', () => {
    const dash = read('features/dashboard/screens/DashboardScreen.js');
    assert.match(dash, /DashboardSkeleton/, 'dashboard must render a skeleton while first loading');
    assert.match(dash, /showSkeleton/, 'skeleton must gate on first load (loading with no meals)');
    assert.match(dash, /animate-pulse/, 'skeleton placeholders must pulse');
    assert.match(dash, /Loading your week/, 'skeleton must keep an accessible loading label');
    assert.doesNotMatch(dash, /ActivityIndicator/, 'spinner must not compete with the skeleton');
  });

  it('progress shows a skeleton while first loading (no spinner)', () => {
    const src = read('features/progress/screens/ProgressScreen.js');
    assert.match(src, /ProgressSkeleton/, 'progress must render a skeleton while first loading');
    assert.match(src, /loading && !entries\.length && !mergedMeals\.length/, 'skeleton must keep the first-load gate (cached data paints instantly)');
    assert.match(src, /animate-pulse/, 'skeleton placeholders must pulse');
    assert.match(src, /Loading your progress/, 'skeleton must keep an accessible loading label');
    assert.doesNotMatch(src, /ActivityIndicator/, 'spinner must not compete with the skeleton');
  });

  it('meals suggestions show a skeleton on cache miss (search spinners stay)', () => {
    const src = read('features/meals/screens/MealsScreen.js');
    assert.match(src, /SuggestionSkeletons/, 'suggestions row must skeletonize on cache miss');
    assert.match(src, /suggestionsLoading \? <SuggestionSkeletons \/>/, 'skeleton must keep the exact suggestionsLoading gate');
    assert.match(src, /Loading suggestions/, 'skeleton must keep an accessible loading label');
    assert.match(src, /\{searching && <ActivityIndicator/, 'typing search keeps its inline spinner (no flicker)');
  });

  it('DaySelector rebuilds from props every mount (no stale retained strip)', () => {
    const src = read('shared/components/dashboard/DaySelector.js');
    assert.doesNotMatch(src, /retainedStrip/, 'DaySelector must not retain window/pad/scroll across unmounts');
    assert.match(src, /useMemo/, 'week pills must derive from props (selected + zone), not retained state');
  });

  it('selecting another week triggers a fetch for that week', () => {
    const layout = read('app/(tabs)/_layout.js');
    // loadWeek() takes no args and always fetches new Date() -> cannot load other weeks
    const supportsRef = /loadWeek\s*=\s*useCallback\s*\(\s*async\s*\(\s*\{[^}]*\}?\s*=?\s*\{?[^)]*reference|loadWeek\([^)]*reference|weekRange\(selected/i.test(layout)
      || /fetchMeals\(\s*from/.test(layout);
    assert.equal(supportsRef, true, 'loadWeek cannot fetch an arbitrary selected week');
  });

  it('hydration seeds the week cache under the restored week (instant landing)', () => {
    const layout = read('app/(tabs)/_layout.js');
    assert.doesNotMatch(layout, /weekRange\(new Date\(\)/, 'seed must not assume the cached week is the current week');
    assert.match(layout, /restoredDate/, 'hydration must parse the restored selected date before seeding');
    assert.match(layout, /weekRange\(restoredDate/, 'seed week must derive from the restored selection so landing paints instantly');
  });

  it('week cache is per-week (fresh week A never satisfies week B)', () => {
    const layout = read('app/(tabs)/_layout.js');
    assert.match(layout, /weekCache/, 'no per-week cache: week navigation reuses one global freshness check');
    assert.match(layout, /weekFresh|weekCache\[weekId\]/, 'freshness must be checked per requested weekId');
  });

  it('saved meals merge id-deduped into their own week (no double-count)', () => {
    const layout = read('app/(tabs)/_layout.js');
    assert.match(layout, /mergeUnique/, 'handleSave must dedupe by id so double-taps never double-count');
    assert.match(layout, /savedWeekId/, 'handleSave must merge into the saved meal\u2019s week, not blindly into the visible one');
  });

  it('no phantom 2000 goal: unset goal stays null with an explicit setup prompt', () => {
    const route = read('app/(tabs)/dashboard.js');
    const dash = read('features/dashboard/screens/DashboardScreen.js');
    const session = read('features/auth/session.js');
    assert.doesNotMatch(route, /\?\? 2000/, 'dashboard route fabricates 2000 for a missing goal');
    assert.doesNotMatch(dash, /s\.goal \?\? 2000/, 'DashboardScreen fabricates 2000 for a missing goal');
    assert.match(dash, /Set your calorie goal/, 'missing goal must render an explicit setup prompt');
    assert.match(session, /useState\(null\)/, 'goal must start null, not 2000');
  });

  it('dashboard macros prefer the plan split over fixed 25/50/25', () => {
    const dash = read('features/dashboard/screens/DashboardScreen.js');
    assert.match(dash, /calcPlan/, 'dashboard must derive plan macros (backend split wins)');
    assert.match(dash, /missingOnboardingFields/, 'plan macros need the completeness gate with 25/50/25 fallback');
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

  it('meal delete is safe: guarded, id-less rows hide trash, 404 stays deleted', () => {
    const row = read('shared/components/dashboard/MealRow.js');
    assert.match(row, /deleting/, 'trash needs an in-flight guard (double-tap 404s)');
    assert.match(row, /meal\?\.id/, 'trash must hide when the row has no id');
    const layout = read('app/(tabs)/_layout.js');
    const delIx = layout.indexOf('const handleMealDeleted');
    assert.ok(delIx >= 0, 'handleMealDeleted must exist');
    const delBody = layout.slice(delIx, layout.indexOf('}, [meals, weekCache, rangeMeals]', delIx));
    assert.match(delBody, /status === 404/, 'delete must treat 404 as already-gone, not roll back');
    assert.doesNotMatch(delBody, /throw e/, 'delete must not rethrow to the UI (redbox)');
  });

  it('day-strip lab renders the same DaySelector module as home (no fork)', () => {
    const lab = read('app/day-strip-lab.js');
    assert.match(lab, /shared\/components\/dashboard\/DaySelector/, 'lab must import the real DaySelector, not a copy');
    assert.match(lab, /__DEV__/, 'lab must be dev-gated (never a production screen)');
    const rootLayout = read('app/_layout.tsx');
    assert.match(rootLayout, /day-strip-lab/, 'lab route must be reachable for authed users (allowedRoutes)');
  });
});
