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

  it('meals shows a first-load skeleton while hydration fetches (no empty flash)', () => {
    const src = read('features/meals/screens/MealsScreen.js');
    assert.match(src, /MealsFirstLoadSkeleton/, 'meals must render a first-load skeleton while hydration fetches');
    assert.match(src, /showFirstLoad/, 'skeleton must gate on first load (loading with no data)');
    assert.match(src, /Loading meals/, 'skeleton must keep an accessible loading label');
    assert.match(src, /animate-pulse/, 'skeleton placeholders must pulse');
    assert.match(src, /\{searching && <ActivityIndicator/, 'typing search keeps its inline spinner (no flicker)');
  });

  it('meals route passes loading so the first-load gate can fire', () => {
    const route = read('app/(tabs)/meals.js');
    assert.match(route, /loading=\{s\.loading/, 'meals route must pass tab-shell loading to MealsScreen');
  });

  it('progress focus revalidates weights only when stale (no refetch storm)', () => {
    const layout = read('app/(tabs)/_layout.js');
    assert.match(layout, /refreshWeightsIfStale/, 'shell must expose a stale-guarded weights refresher');
    assert.match(layout, /weightsRefreshedAt/, 'guard needs a last-fetch timestamp shared with hydration');
    const dash = read('features/progress/screens/ProgressScreen.js');
    assert.match(dash, /refreshWeightsIfStale/, 'progress focus must use the stale-guarded refresher');
    const route = read('app/(tabs)/history.js');
    assert.match(route, /refreshWeightsIfStale/, 'history route must pass the guarded refresher through');
  });

  it('meals never re-prefetches the same food image', () => {
    const src = read('features/meals/screens/MealsScreen.js');
    assert.match(src, /prefetchedUrlsRef/, 'prefetch needs a ref of already-prefetched URLs');
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
    assert.match(dash, /planMacrosFromGoal/, 'dashboard must derive macros from the goal kcal (backend split wins)');
    assert.match(dash, /missingOnboardingFields/, 'plan macros need the completeness gate with 25/50/25 fallback');
  });

  it('pull-to-refresh re-reads the user so the target is database-fresh', () => {
    const dash = read('features/dashboard/screens/DashboardScreen.js');
    assert.match(dash, /refreshUser/, 'pull-to-refresh must revalidate kcal, not just meals/weights');
    const layout = read('app/(tabs)/_layout.js');
    assert.match(layout, /refreshUser/, 'tab shell must refresh the session user alongside weights');
  });

  it('an uncomputed calorie plan explains itself instead of silently keeping old kcal', () => {
    const dash = read('features/dashboard/screens/DashboardScreen.js');
    assert.match(dash, /finish profile|complete.*profile|plan.*missing/i, 'plan:null must render guidance, not a silent stale target');
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

  it('authed menu routes are reachable outside tabs (allowedRoutes)', () => {
    const rootLayout = read('app/_layout.tsx');
    // Missing entries bounce authed users to dashboard via RouteGuard
    // (More -> Weight Tracker died as a silent "refresh").
    // Appearance screen was removed (theme fixed to light) — no route to allow.
    assert.match(rootLayout, /'\/weight-tracker'/, 'Weight Tracker must not bounce to dashboard');
  });

  it('category tiles browse via the category API instead of poisoning mealType', () => {
    const src = read('features/meals/screens/MealsScreen.js');
    // 'Fruits' etc. are not meal types: POST /api/meals and /suggestions
    // reject them, so a tile tap must never call selectMealType(tile.key).
    assert.doesNotMatch(src, /selectMealType\(tile\.key\)/, 'category tiles must not set mealType to a category');
    assert.match(src, /openCategory/, 'category tiles need their own browse handler');
    assert.match(src, /searchFoodsByCategory/, 'category browse must use the server category search');
    assert.match(src, /setCategoryFilter\(null\)/, 'typing a query must leave category browse');
    const api = read('shared/lib/foodsApi.js');
    assert.match(api, /searchFoodsByCategory/, 'foodsApi must expose the category search');
  });
});

describe('cold-start + race hardening', () => {
  it('appCache exports the helpers the shell hydrates with', () => {
    const cache = read('shared/lib/appCache.js');
    assert.match(cache, /export function storageKey/, 'storageKey must be exported (the shell imports it)');
    assert.match(cache, /export function ttlFor/, 'ttlFor must be exported (the shell imports it)');
    assert.match(cache, /planAttention:/, 'planAttention needs a TTL entry or reads always expire to null');
  });

  it('late 401s only clear the session they belong to', () => {
    const store = read('shared/lib/tokenStore.js');
    assert.match(store, /handleUnauthorized\(failedToken\)/, 'handleUnauthorized must take the failed token');
    assert.match(store, /failedToken !== cached/, 'a 401 for an old token must not kill a newer session');
    const api = read('shared/lib/api.js');
    assert.match(api, /handleUnauthorized\(token\)/, 'api must pass the token it actually sent');
    assert.match(api, /retry5xx/, 'GETs must retry a transient 5xx (cold start)');
    assert.match(api, /retryablePost \? 3/, 'code-issuing auth POSTs need 3 attempts to survive a cold start');
  });

  it('app boot pings the backend awake (cold-start warm-up)', () => {
    const session = read('features/auth/session.js');
    assert.match(session, /\/health/, 'session bootstrap must fire a warm-up ping so register/login hits a warm server');
  });

  it('my-foods view is a flag, not a fake query', () => {
    const src = read('features/meals/screens/MealsScreen.js');
    assert.match(src, /myFoodsView/, 'my-foods needs its own view flag');
    assert.doesNotMatch(src, /setQuery\('My foods'\)/, 'fake query text let the debounced search clobber the list');
  });

  it('sheet dismissal is blocked mid-save', () => {
    const scan = read('features/scan/screens/ScanResultScreen.js');
    assert.match(scan, /if \(saving\) return true/, 'back button must not close the result overlay mid-save');
    const weight = read('shared/components/WeightLogSheet.js');
    assert.match(weight, /if \(busy\) return/, 'weight sheet must not dismiss mid-save');
    const food = read('features/meals/components/FoodDetailSheet.js');
    assert.match(food, /if \(saving\) return/, 'food sheet must not dismiss mid-save');
  });

  it('stale async responses cannot repaint newer state', () => {
    const layout = read('app/(tabs)/_layout.js');
    assert.match(layout, /weightsMutatedAt/, 'weights GET must not clobber a just-saved weigh-in');
    assert.doesNotMatch(layout, /isSelectedWeek \|\| weekId ===/, 'stale week response must not paint the visible week');
    const session = read('features/auth/session.js');
    assert.match(session, /isCurrent/, 'timezone sync must not overwrite a switched account');
  });

  it('offline scan resets busy before returning', () => {
    const src = read('features/scan/screens/PictureUploadScreen.js');
    const offline = src.slice(src.indexOf("You're offline") - 300, src.indexOf("You're offline"));
    assert.match(offline, /setBusy\(false\)/, 'offline early-return must reset busy or the shutter stays disabled');
  });
});

describe('auth back navigation', () => {
  it('AuthScaffold renders the shared back button when onBack is set', () => {
    const scaffold = read('shared/components/auth/AuthScaffold.js');
    assert.match(scaffold, /onBack/, 'scaffold must accept onBack');
    assert.match(scaffold, /BackButton/, 'scaffold must render the shared BackButton');
    const button = read('shared/components/auth/BackButton.js');
    assert.match(button, /Go back/, 'back button needs an accessible label');
    assert.match(button, /ChevronLeft/, 'back button must show a chevron');
  });

  it('login/register/verify/forgot expose onBack; welcome has none', () => {
    for (const f of [
      'features/auth/screens/LoginScreen.js',
      'features/auth/screens/RegisterScreen.js',
      'features/auth/screens/VerifyScreen.js',
      'features/auth/screens/ForgotScreen.js',
    ]) {
      assert.match(read(f), /onBack/, `${f} must accept onBack`);
    }
    const welcome = read('features/auth/screens/WelcomeScreen.js');
    assert.doesNotMatch(welcome, /onBack|BackButton/, 'welcome is the entry screen — nowhere to go back to');
  });

  it('auth routes send back somewhere sensible (entries replace, no stack to pop)', () => {
    // Login/register land on welcome; verify/forgot land on login (which
    // prefills the staged email). router.back() would be a no-op or worse
    // after replace-based entry, so destinations are explicit.
    assert.match(read('app/login.js'), /router\.replace\('\/welcome'\)/, 'login back must go to welcome');
    assert.match(read('app/register.js'), /router\.replace\('\/welcome'\)/, 'register back must go to welcome');
    assert.match(read('app/verify.js'), /router\.replace\('\/login'\)/, 'verify back must go to login');
    assert.match(read('app/forgot.js'), /router\.replace\('\/login'\)/, 'forgot back must go to login');
  });

  it('forgot code step backs into its own email step first', () => {
    const src = read('features/auth/screens/ForgotScreen.js');
    assert.match(src, /onBack=\{\(\) => setPhase\('email'\)\}/, 'reset-code back must return to the email step, not leave the flow');
  });
});
