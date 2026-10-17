import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, View } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import BottomNav from '../../shared/components/ui/BottomNav';
import QuickLogSheet from '../../shared/components/ui/QuickLogSheet';
import WeightLogSheet from '../../shared/components/WeightLogSheet';
import SplashOverlay from '../../shared/components/SplashOverlay';
import PictureUploadScreen from '../../features/scan/screens/PictureUploadScreen';
import ScanResultScreen from '../../features/scan/screens/ScanResultScreen';
import { useCameraPermissions } from 'expo-camera';
   import { fetchWeek, fetchMeals, createMeal, deleteMealById, weekRange } from '../../shared/lib/mealsApi';
   import { fetchWeights, createWeight, fetchWeightGoal, deleteWeight } from '../../shared/lib/weightsApi';
   import { calcTotals } from '../../shared/utils/totals';
   import { dateKey, effectiveTimeZone } from '../../shared/utils/format';
   import { shiftDayKey } from '../../shared/utils/streak';
   import { toastSuccess, toastError } from '../../shared/utils/toast';
   import { useSession } from '../../features/auth/session';
   import { TabShellProvider } from '../../features/tabs/shell';
   import { writeCache, scopedKey, setCacheOwner, storageKey, ttlFor } from '../../shared/lib/appCache';

   import AsyncStorage from '@react-native-async-storage/async-storage';

const SPLASH_MIN_MS = 450;
// Freshness window for one cached calendar week. Module scope (not state)
// so week-scoped fetchers can depend on it without re-creating.
const WEEK_CACHE_TTL_MS = 5 * 60 * 1000;
// Weeks kept in the in-memory week cache. Unbounded, month-hopping users
// accumulate one meals array per visited week for the whole session.
const WEEK_CACHE_MAX = 12;
function pruneWeekCache(cache) {
  const keys = Object.keys(cache);
  if (keys.length <= WEEK_CACHE_MAX) return cache;
  const keep = keys
    .sort((a, b) => (cache[b].fetchedAt || 0) - (cache[a].fetchedAt || 0))
    .slice(0, WEEK_CACHE_MAX);
  const next = {};
  for (const k of keep) next[k] = cache[k];
  return next;
}
// Background weights refreshes (focus effects) skip when a fetch landed
// within this window. Module scope so the stable callback needs no dep.
const WEIGHTS_REFRESH_TTL_MS = 5 * 60 * 1000;

export default function TabsLayout() {
  const router = useRouter();
  const segments = useSegments();
   const { user, authChecked, goal, refreshUser } = useSession();
   const userKey = user ? (user._id || user.id || user.email) : null;
   const [sheetOpen, setSheetOpen] = useState(false);
   const [navHeight, setNavHeight] = useState(0);
   // Camera overlay mode: null = closed, otherwise 'scan' | 'barcode' | ...
   // (same keys as PictureUploadScreen's MODES). Lets screens open the camera
   // directly in the right mode instead of going through QuickLogSheet.
   const [scanMode, setScanMode] = useState(null);
   const openScan = useCallback((mode = 'scan') => setScanMode(mode), []);
   const [scanResult, setScanResult] = useState(null);
   const [meals, setMeals] = useState([]); // visible calendar week (dashboard view)
   // Per-week cache so week navigation preserves progress: weekId -> { meals, fetchedAt }.
   // The old single-week freshness check ignored the requested week and
   // silent-skipped refetches for any week within 5 min of the last load.
   const [weekCache, setWeekCache] = useState({});
   // Always a valid Date from first render. The cached day is restored
   // asynchronously in the hydration effect below: readCache is async, and
   // new Date(promise) is an Invalid Date whose empty dateKey makes the day
   // strip rebuild its window on every render (infinite "Too many re-renders").
   const [selectedDate, setSelectedDate] = useState(() => new Date());
   // Ref mirror so loadWeek (a useCallback) can compare the requested week
   // against the selected week without re-creating on every date change.
    const selectedDateRef = useRef(selectedDate);
    useEffect(() => {
      selectedDateRef.current = selectedDate;
    }, [selectedDate]);
    // Ref mirrors so week/range fetchers stay referentially stable: they read
    // UI state via refs and write via functional setState, never subscribing
    // to it. Without this, loadWeek's identity changes on every setMeals /
    // setWeekCache, which re-fires every consumer effect that (correctly)
    // lists it in deps — the Dashboard spinner loop.
    const mealsRef = useRef(meals);
    useEffect(() => { mealsRef.current = meals; }, [meals]);
    const weekCacheRef = useRef(weekCache);
    useEffect(() => { weekCacheRef.current = weekCache; }, [weekCache]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState(null);
   const [weights, setWeights] = useState([]);
   const [weightGoal, setWeightGoalState] = useState(null);
   const [logWeightOpen, setLogWeightOpen] = useState(false);
   const [splashMinDone, setSplashMinDone] = useState(false);
   const [cameraPermission, requestCameraPermission] = useCameraPermissions();
   const cameraPermissionAskedRef = useRef(false);

  // Longer-horizon meals for the Progress screen (up to 1 year back),
  // merged with the week view so daily-average/trend cards never show
  // "No meals this period" just because a meal is older than this week.
  const [rangeMeals, setRangeMeals] = useState([]);
  const rangeFromRef = useRef(null);

  // Single derived object ??" every consumer (Progress, Dashboard) reads the
  // same source of truth. Replaced the old duplicated progressCache whose
  // copies went stale after optimistic mutations (weight logged ?+' chart and
  // "Your Weight" card never updated because only weights changed).
  const progressCache = useMemo(() => ({
    weights,
    weightGoal,
    meals: meals.length ? meals : rangeMeals,
  }), [weights, weightGoal, meals, rangeMeals]);

  const active = segments[segments.length - 1] ?? 'dashboard';

  // Calendar zone for this user: their stored zone, else the device zone,
  // UTC when nothing is usable. Every fetch and every grouping below uses
  // it so client days match the server's ?from/?to windows.
  const timeZone = useMemo(() => effectiveTimeZone(user), [user]);

  // Mirrors for the stable fetchers below (see mealsRef/weekCacheRef above).
  const timeZoneRef = useRef(timeZone);
  useEffect(() => { timeZoneRef.current = timeZone; }, [timeZone]);
  const userKeyRef = useRef(userKey);
  useEffect(() => { userKeyRef.current = userKey; }, [userKey]);
  // Skip-verification accounts: every data route outside plan/auth is
  // verified-only, so fetching just 403s. The root RouteGuard parks these
  // users on /verify; until they verify, the fetchers no-op (the layout still
  // mounts for a commit before that redirect, and a fetch storm there would
  // fire the global 403 handler: session clear + resend + reroute race).
  const unverifiedRef = useRef(user?.emailVerified === false);
  useEffect(() => { unverifiedRef.current = user?.emailVerified === false; }, [user]);
   const hydratedForRef = useRef(null);
   const loadWeekRequestRef = useRef(null);
   const loadWeekPromiseRef = useRef(null);
   // Last weights/goal fetch (hydration, focus, or explicit refresh). Focus
   // effects skip when recent so tab visits don't refetch every time.
   const weightsRefreshedAt = useRef(0);
   // Bumped by a successful weigh-in/delete: a GET that started BEFORE that
   // write must not paint its stale snapshot over the just-saved state.
   const weightsMutatedAt = useRef(0);

    const loadWeek = useCallback(async ({ silent, reference } = {}) => {
     // Unverified account: data routes 403 by design — return empty and let
     // the root guard reroute to /verify (see unverifiedRef above).
     if (unverifiedRef.current) return [];
     // Stable identity: reads UI state via refs, writes via functional
     // setState — so consumers can safely list it in effect deps without
     // re-firing on every setMeals/setWeekCache (the Dashboard loop).
     const tz = timeZoneRef.current;
     const key = userKeyRef.current;
     const refDate = reference || selectedDateRef.current || new Date();
     const { from: refFrom } = weekRange(refDate, tz);
     const weekId = `${refFrom}|${tz}`;
     const selectedWeekId = `${weekRange(selectedDateRef.current || new Date(), tz).from}|${tz}`;
     const isSelectedWeek = weekId === selectedWeekId;

     // Per-week freshness: a fresh week-A cache must never satisfy a
     // week-B request (the old global check did exactly that and left
     // other weeks' rings permanently empty).
     const cached = weekCacheRef.current[weekId];
     const weekFresh = cached?.meals && (Date.now() - (cached.fetchedAt || 0) < WEEK_CACHE_TTL_MS);

     // If we have fresh data and this is a background request, resolve immediately
     if (weekFresh && silent) {
       if (isSelectedWeek && cached.meals !== mealsRef.current) {
         setMeals(cached.meals);
       }
       return cached.meals;
     }

     // Request deduplication: prevent multiple simultaneous requests for the same week
     if (loadWeekRequestRef.current === weekId && loadWeekPromiseRef.current) {
       return loadWeekPromiseRef.current;
     }

     // Set up loading state for non-silent requests (always the visible week)
     if (!silent) {
       setLoading(true);
       setError(null);
     }

      // Create the fetch promise
      const fetchPromise = (async () => {
        try {
          const mealsData = await fetchWeek(refDate, tz);
          // Account switched while this request was in flight: drop the
          // result so the previous owner's meals never overwrite the new
          // owner's state (their hydration repopulates separately).
          if (hydratedForRef.current && hydratedForRef.current.key !== userKeyRef.current) {
            return mealsData;
          }
          const stamped = Date.now();
          setWeekCache((prev) => pruneWeekCache({ ...prev, [weekId]: { meals: mealsData, fetchedAt: stamped } }));
          // Resolve-time check only: `isSelectedWeek` was captured when the
          // request STARTED — if the user switched weeks while it was in
          // flight, this stale response would paint the wrong week's meals
          // and poison the persisted cache.
          if (weekId === `${weekRange(selectedDateRef.current || new Date(), tz).from}|${tz}`) {
            setMeals(mealsData);
            writeCache(scopedKey('weekMeals', key), mealsData);
          }
          return mealsData;
        } catch (e) {
          // Error UI only appears when there's nothing cached to show.
          // Silent background failures keep visible data as-is; the caller
          // (hydration) surfaces the error only when nothing is cached.
          if (!silent) setError(e.message);
          throw e;
        } finally {
         if (!silent) setLoading(false);
         // Clear the request ref after completion
         if (loadWeekRequestRef.current === weekId) {
           loadWeekRequestRef.current = null;
           loadWeekPromiseRef.current = null;
         }
       }
     })();

      // Store request info for deduplication
      loadWeekRequestRef.current = weekId;
      loadWeekPromiseRef.current = fetchPromise;

      return fetchPromise;
    }, []);

   // Load meals for a horizon ending today (e.g. 365 days for the Progress
   // screen's daily-average card). Skipped when a wider horizon is already
   // loaded; results merge under the week view so both screens stay correct.
   // Stable identity (reads zone via ref) for the same reason as loadWeek.
   const loadRangeMeals = useCallback(async (days) => {
     if (unverifiedRef.current) return;
     const tz = timeZoneRef.current;
     // Zoned calendar arithmetic: the old device-local `new Date(y, m, d-days)`
     // drifted a day when the device zone differed from the user's zone, and
     // the bare-`from` guard below reused one zone's window for another after
     // travel. Both broke streak/average boundary days for travelers.
     const n = Math.trunc(Number(days));
     const todayKey = dateKey(new Date(), tz);
     const from = shiftDayKey(todayKey, -Math.max(0, Number.isFinite(n) ? n : 0));
     if (!from) return;
     // A wider horizon in the SAME zone already covers this one — nothing to
     // fetch. A zone change always refetches (legacy bare-string guards do one
     // silent revalidate, then settle into the tz-keyed shape).
     const cur = rangeFromRef.current;
     const curFrom = typeof cur === 'string' ? cur : cur?.from;
     const curTz = typeof cur === 'object' && cur ? cur.tz : undefined;
     if (curFrom && curTz === tz && curFrom <= from) return;
     const data = await fetchMeals(from, todayKey, undefined, tz);
     // Same guards at resolve time: a late narrow response must not shrink a
     // wider horizon, and a late response from a previous owner must not
     // overwrite the new owner's range.
     if (hydratedForRef.current && hydratedForRef.current.key !== userKeyRef.current) return;
     const curNow = rangeFromRef.current;
     const curFromNow = typeof curNow === 'string' ? curNow : curNow?.from;
     const curTzNow = typeof curNow === 'object' && curNow ? curNow.tz : undefined;
     if (curFromNow && curTzNow === tz && curFromNow <= from) return;
     rangeFromRef.current = { tz, from };
     setRangeMeals(data);
   }, []);

   // Ref mirror of the session refresher: its identity changes every
   // provider render, which would churn every callback that lists it.
   const refreshUserRef = useRef(null);
   useEffect(() => { refreshUserRef.current = refreshUser; });

    const fetchWeightsAndGoal = useCallback(async () => {
    // Unverified account: weights routes are verified-only (see unverifiedRef).
    if (!user || user.emailVerified === false) return;
    const startedAt = Date.now();
    // Session kcal refresh runs CONCURRENTLY with the weights+goal GETs —
    // awaiting it strictly after used to add a serial third roundtrip to
    // every hydration/pull-to-refresh/focus pass.
    const meJob = refreshUserRef.current ? refreshUserRef.current().catch(() => {}) : Promise.resolve();
    try {
      const [w, g] = await Promise.all([fetchWeights(), fetchWeightGoal()]);
      // A weigh-in/delete landed while this GET was in flight: its handler
      // already set the fresh state (and possibly a recomputed goal) — keep
      // that instead of the stale snapshot.
      if (weightsMutatedAt.current <= startedAt) {
        setWeights(w);
        setWeightGoalState(g);
        writeCache(scopedKey('weights', userKey), w);
        writeCache(scopedKey('weightGoal', userKey), g);
      }
      weightsRefreshedAt.current = Date.now();
    } catch {
      // Offline / 403 (unverified) / server errors: keep cached data as-is
      // instead of an unhandled rejection that leaves state stale.
    }
    // Still awaited so pull-to-refresh settles fully; already caught above
    // so a /me failure never fails this function.
    await meJob;
  }, [user, userKey]);

  // Background refresher for focus effects: skips when a fetch landed
  // recently (hydration or a prior focus) so tab visits don't fire 2 GETs
  // every time. Explicit refreshes (pull-to-refresh, retry) keep calling
  // fetchWeightsAndGoal directly and always hit the network.
  const refreshWeightsIfStale = useCallback(async () => {
    if (!user) return;
    if (Date.now() - weightsRefreshedAt.current < WEIGHTS_REFRESH_TTL_MS) return;
    await fetchWeightsAndGoal();
  }, [user, fetchWeightsAndGoal]);

   const rangePersistedRef = useRef(null);

    // Cache persists run only for the hydrated owner: on account switch the
    // first render still holds the previous owner's state, and an unguarded
    // write would file it under the new key before hydration clears it.
    // Persist selectedDate to cache whenever it changes
    useEffect(() => {
      if (!userKey || (hydratedForRef.current && hydratedForRef.current.key !== userKey)) return;
      writeCache(scopedKey('selectedDate', userKey), selectedDate.toISOString());
    }, [selectedDate, userKey]);

    // Persist the long-horizon meals so the Progress streak/average cards
    // paint instantly on the next cold start (1h TTL, silent revalidate).
    useEffect(() => {
      if (!userKey || (hydratedForRef.current && hydratedForRef.current.key !== userKey) || !rangeMeals.length) return;
      // Skip rewrites when size + horizon are unchanged so a multi-year
      // history isn't re-stringified on every state change. The guard ref is
      // {tz,from} (legacy bare strings tolerated); only `from` is persisted
      // so the cache shape stays {meals, from: 'YYYY-MM-DD'}.
      const ref = rangeFromRef.current;
      const refFrom = typeof ref === 'string' ? ref : ref?.from ?? null;
      const stamp = `${rangeMeals.length}:${refFrom}`;
      if (rangePersistedRef.current === `${userKey}:${stamp}`) return;
      rangePersistedRef.current = `${userKey}:${stamp}`;
      writeCache(scopedKey('rangeMeals', userKey), { meals: rangeMeals, from: refFrom });
    }, [rangeMeals, userKey]);

    // Selection changes are painted by the dashboard's silent week-fill
    // (loadWeek paints the selected week from the per-week cache on a hit,
    // fetches it on a miss), so no render-phase sync is needed here.

    useEffect(() => {
     if (!(authChecked && user)) return;
     const key = user._id || user.id || user.email;
     // Skip-verification accounts hydrate once while unverified with every
     // fetcher no-oped (verified-only routes would 403). The verified flag
     // in the guard forces one real hydration pass after they verify —
     // otherwise the dashboard would stay empty until a manual refresh.
     const verified = user.emailVerified !== false;
     const hydrated = hydratedForRef.current;
     if (hydrated && hydrated.key === key && (hydrated.verified || !verified)) return;
     hydratedForRef.current = { key, verified };
     // New account (login / switch): drop the previous owner's in-memory
     // state first so their meals/weights never flash, then hydrate from
     // that owner's namespaced cache while the network revalidates.
     setCacheOwner(key);
     setMeals([]);
     setWeekCache({});
     setRangeMeals([]);
     setWeights([]);
     setWeightGoalState(null);
     setSelectedDate(new Date());
     setError(null);
     setLoading(true);
     rangeFromRef.current = null;
     weightsRefreshedAt.current = 0;
     let alive = true;
      (async () => {
        // Read cache with timestamps to check freshness. Stale-while-revalidate:
        // expired entries are still returned (stale:true) and painted
        // immediately so offline cold starts render last-known data instead
        // of an empty screen; a successful network revalidation then replaces
        // them. Failures keep whatever is on screen.
        const readCacheWithTimestamp = async (cacheKey) => {
          try {
            const raw = await AsyncStorage.getItem(storageKey(cacheKey));
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            const stale = Date.now() - parsed.fetchedAt > ttlFor(cacheKey);
            // For namespaced keys (which we always use with userKey), ownership check is not needed
            // as the key already isolates owners (contains ':')
            return { data: parsed.data, fetchedAt: parsed.fetchedAt, stale };
          } catch {
            return null;
          }
        };

       const [
         weekMealsResult,
         weightsResult,
         weightGoalResult,
         selectedDateResult,
         rangeMealsResult
       ] = await Promise.all([
         readCacheWithTimestamp(scopedKey('weekMeals', key)),
         readCacheWithTimestamp(scopedKey('weights', key)),
         readCacheWithTimestamp(scopedKey('weightGoal', key)),
         readCacheWithTimestamp(scopedKey('selectedDate', key)),
         readCacheWithTimestamp(scopedKey('rangeMeals', key)),
       ]);

       if (!alive) return;

        // Set data from cache if available
        // The cached week belongs to the last-selected week (weekMeals is
        // written on every selected-week load), so seed it under the
        // RESTORED selected week — not the current week. Landing then
        // paints the selected week instantly and correctly; the skeleton
        // only appears when there is genuinely no cache (emergency).
        let restoredDate = null;
        if (selectedDateResult?.data) {
          const d = new Date(selectedDateResult.data);
          // Corrupt cache must never resurrect an Invalid Date (see above).
          if (!Number.isNaN(d.getTime())) restoredDate = d;
        }
        if (weekMealsResult?.data) {
          setMeals(weekMealsResult.data);
          // Seed the per-week map so landing paints instantly instead of
          // refetching (and the current week never mistakes this for its own data).
          const seedId = `${weekRange(restoredDate || new Date(), timeZone).from}|${timeZone}`;
          setWeekCache({ [seedId]: { meals: weekMealsResult.data, fetchedAt: weekMealsResult.fetchedAt } });
          setLoading(false); // Hide loading state if we have cached meals
        }
        if (weightsResult?.data) setWeights(weightsResult.data);
        if (weightGoalResult?.data !== undefined) setWeightGoalState(weightGoalResult.data);
        if (restoredDate) {
          const d = restoredDate;
          setSelectedDate((prev) => (dateKey(prev, timeZone) === dateKey(d, timeZone) ? prev : d));
        }
       // Long-horizon meals paint the Progress streak/average instantly.
       // Fresh cache also restores the horizon guard so the focus fetch
       // stays a no-op; stale cache paints but refetches silently on focus.
       const rangeCache = Array.isArray(rangeMealsResult?.data)
         ? { meals: rangeMealsResult.data, from: null }
         : rangeMealsResult?.data;
       if (rangeCache?.meals?.length) {
         setRangeMeals(rangeCache.meals);
         rangeFromRef.current = rangeCache.from ?? null;
       }

       // Determine if background revalidation is needed based on cache freshness
       const now = Date.now();
       const WEEKMEALS_FRESHNESS_THRESHOLD = 5 * 60 * 1000; // 5 minutes
       const WEIGHTS_FRESHNESS_THRESHOLD = 4 * 60 * 60 * 1000; // 4 hours
       const RANGE_MEALS_FRESHNESS_THRESHOLD = 60 * 60 * 1000; // 1 hour
       
       const weekMealsStale = !weekMealsResult || (now - weekMealsResult.fetchedAt > WEEKMEALS_FRESHNESS_THRESHOLD);
       const weightsStale = !weightsResult || (now - weightsResult.fetchedAt > WEIGHTS_FRESHNESS_THRESHOLD);
       const weightGoalStale = !weightGoalResult || (now - weightGoalResult.fetchedAt > WEIGHTS_FRESHNESS_THRESHOLD);
       // Stale horizon guard is dropped so the next Progress focus
       // silently revalidates; the painted cache stays until it lands.
       if (!rangeMealsResult?.data || (now - rangeMealsResult.fetchedAt > RANGE_MEALS_FRESHNESS_THRESHOLD)) {
         rangeFromRef.current = null;
       }

        // Trigger background revalidation for stale data in parallel:
        // week + weights used to await sequentially (sum of both roundtrips
        // blocked first paint on cold start). Promise.all cuts it to the max.
        // Use silent:true to avoid showing loading spinner for background updates.
        // Failures keep painted (possibly stale) cache; when nothing was
        // cached at all, surface the error and clear loading so the UI shows
        // the retry card instead of spinning forever offline.
        const weekJob = weekMealsStale
          ? loadWeek({ silent: true }).catch((e) => {
              if (alive && hydratedForRef.current?.key === key && !weekMealsResult?.data) {
                setError(e?.message || 'Could not load meals');
              }
            })
          : Promise.resolve();
        if (weightsStale || weightGoalStale) {
          // Background revalidation: runs to completion but NO LONGER gates
          // first paint (see below). Its own catch keeps the floating
          // promise safe; a 5xx that lands after the user moved on is fine.
          fetchWeightsAndGoal().catch(() => {});
        } else if (weightsResult) {
          // Fresh cache and no fetch: seed the guard so the first focus
          // doesn't duplicate a request hydration just proved unnecessary.
          weightsRefreshedAt.current = weightsResult.fetchedAt;
        }
        // First paint gates on the WEEK only: the rings depend on meals (the
        // goal already comes from the login/bootstrap user), while weights
        // + goal + /me revalidate silently in the background. Awaiting the
        // weightsJob here used to hold the skeleton for two extra roundtrips
        // on accounts with nothing cached (fresh login).
        await weekJob;
        if (alive && hydratedForRef.current?.key === key) setLoading(false);
        // Guarantee: any unexpected throw above (e.g. corrupt cache date
        // handling) must still release the spinner so Home can never hang.
      })().catch(() => {
        if (alive && hydratedForRef.current?.key === key) setLoading(false);
      });
     return () => { alive = false; };
   }, [authChecked, user, loadWeek, fetchWeightsAndGoal, timeZone]);

  // Handle meal deletion: persist via API, then drop from every cached
  // week, the visible week, and the long-horizon range so Dashboard +
  // Progress stay in sync. Rolls back on failure so the row never silently
  // vanishes.
   const handleMealDeleted = useCallback(async (mealId) => {
     const id = String(mealId);
     const prevWeek = meals;
     const prevCache = weekCache;
     const prevRange = rangeMeals;
     const dropId = (list) => list.filter((meal) => String(meal.id || meal._id) !== id);
     setMeals((prev) => dropId(prev));
     setWeekCache((prev) => {
       const next = {};
       for (const [k, entry] of Object.entries(prev)) {
         next[k] = { ...entry, meals: dropId(entry.meals || []) };
       }
       return next;
     });
      setRangeMeals((prev) => dropId(prev));
      try {
        await deleteMealById(mealId);
        toastSuccess('Meal deleted!');
      } catch (e) {
        // Already gone on the server (double-tap, stale phone cache): the
        // row is already in the desired state, so keep it dropped instead
        // of resurrecting it. The toast below covers real failures; nothing
        // rethrows, so delete can never redbox the screen.
        if (e?.status === 404) {
          toastSuccess('Meal deleted!');
          return;
        }
        setMeals(prevWeek);
        setWeekCache(prevCache);
        setRangeMeals(prevRange);
        toastError('Could not delete', e.message);
      }
   }, [meals, weekCache, rangeMeals]);

  // Handle weight logging via WeightLogSheet's onSave({ value }): POSTs the
  // weight and merges the result (same-day re-logs replace in place). The
  // weight goal is edited on the Weight Tracker screen, never here.
  const handleWeightSave = useCallback(async ({ value } = {}) => {
    const { weight, updated } = await createWeight({ value });
    weightsMutatedAt.current = Date.now();
    const wid = String(weight.id || weight._id);
    const next = updated && weights.some((w) => String(w.id || w._id) === wid)
      ? weights.map((w) => (String(w.id || w._id) === wid ? weight : w))
      : [...weights, weight];
    setWeights(next);
    writeCache(scopedKey('weights', userKey), next);
    toastSuccess('Weight logged!');
    return weight;
  }, [userKey, weights]);

  const handleDeleteWeight = useCallback(async (weightId) => {
    const id = String(weightId);
    const prev = weights;
    setWeights(prev.filter((x) => String(x.id || x._id) !== id));
    try {
      await deleteWeight(weightId);
      weightsMutatedAt.current = Date.now();
      toastSuccess('Weight entry deleted!');
    } catch (e) {
      setWeights(prev);
      toastError('Could not delete', e.message);
      throw e;
    }
  }, [weights]);

  // Save a meal (manual entry, catalog sheet, scan): POST then merge into the
  // saved meal's week (id-deduped, so double-taps never double-count) and the
  // long-horizon range so Dashboard + calendar + Progress stay in sync.
  // Stamps the client-side loggedAt (ISO with offset) when callers omit it so
  // the meal lands on the device's calendar day instead of the server clock's.
  // Throws so the caller (sheet/form) can show the error inline instead of guessing.
   const handleSave = useCallback(async (meal) => {
     const payload = meal && meal.loggedAt ? meal : { ...meal, loggedAt: new Date().toISOString() };
     const saved = await createMeal(payload);
     const savedId = String(saved.id || saved._id);
     const mergeUnique = (prev) => (prev.some((m) => String(m.id || m._id) === savedId) ? prev : [...prev, saved]);
     const stamped = Date.now();
     // Per "always today": callers omit loggedAt and the stamp is now, so the
     // saved week is normally the visible one — but merge by the saved date,
     // never blindly into whatever week happens to be on screen.
     const savedWeekId = `${weekRange(new Date(saved.loggedAt), timeZone).from}|${timeZone}`;
     const selectedWeekId = `${weekRange(selectedDateRef.current || new Date(), timeZone).from}|${timeZone}`;
     setWeekCache((prev) => {
       const entry = prev[savedWeekId];
       if (!entry) return prev;
       return { ...prev, [savedWeekId]: { meals: mergeUnique(entry.meals || []), fetchedAt: stamped } };
     });
     if (savedWeekId === selectedWeekId) {
       setMeals((prev) => mergeUnique(prev));
       writeCache(scopedKey('weekMeals', userKey), mergeUnique(meals));
     }
     setRangeMeals((prev) => mergeUnique(prev));
     toastSuccess('Meal logged!');
     return saved;
   }, [meals, timeZone, userKey]);

  const latestWeight = useMemo(() => {
    let best = null;
    for (const w of weights) {
      const t = new Date(w.loggedAt).getTime();
      if (Number.isNaN(t)) continue;
      if (!best || t >= best.t) best = { t, value: w.value };
    }
    return best ? best.value : null;
  }, [weights]);
  // kcal remaining today for the quick-log sheet. rangeMeals is the full
  // logged history; `meals` is only the selected week, so a user browsing
  // an old week would otherwise see a wrong "remaining" in the sheet.
  const remainingToday = useMemo(() => {
    const key = dateKey(new Date(), timeZone);
    // Cold start: rangeMeals may not have loaded yet while weekMeals has
    // (or vice versa) — merge both, id-deduped, so "remaining" never
    // overcounts what was already eaten.
    const seen = new Set();
    const todays = [...rangeMeals, ...meals].filter((m) => {
      const id = String(m.id || m._id || '');
      if (id) {
        if (seen.has(id)) return false;
        seen.add(id);
      }
      const d = new Date(m.loggedAt);
      return !Number.isNaN(d.getTime()) && dateKey(d, timeZone) === key;
    });
    return Math.round(calcTotals(todays, goal).remaining ?? 0);
  }, [rangeMeals, meals, goal, timeZone]);
   // Derived spinner flag: raw `loading` starts true and is cleared by
   // hydration — which never runs when logged out or expired (its effect
   // bails without a user). Deriving here instead of clearing in an effect
   // guarantees Home can never sit on a spinner forever after sign-out.
   const displayLoading = loading && (user != null || !authChecked);
    // Value to expose through TabShell context. Declared AFTER the handlers it
    // references — building it earlier reads the handler consts before
    // initialization (TDZ) and crashes the whole tab layout on first render.
    // Must stay in sync with what DashboardScreen / ProgressScreen consume:
    // progressCache + goal/loading/error, week + range meals, weights + goal,
    // selectedDate, and every handler the routes pass down as props.
    // refreshUserStable keeps a fixed identity (session's refreshUser is
    // recreated every provider render, which would churn this memo).
    const refreshUserStable = useCallback((...args) => refreshUserRef.current?.(...args), []);
    const tabShellValue = useMemo(() => ({
      progressCache,
      goal,
      user,
      loading: displayLoading,
      error,
      meals,
      rangeMeals,
      weights,
      weightGoal,
      selectedDate,
      setSelectedDate,
      navHeight,
      timeZone,
      loadWeek,
      loadRangeMeals,
      refreshWeights: fetchWeightsAndGoal,
      refreshWeightsIfStale,
      refreshUser: refreshUserStable,
      setSheetOpen,
      setLogWeightOpen,
      deleteMeal: handleMealDeleted,
      handleSave,
      handleWeightSave,
      handleDeleteWeight,
      openScan,
    }), [
      progressCache, goal, user, displayLoading, error, meals, rangeMeals, weights, weightGoal,
       selectedDate, setSelectedDate, navHeight, timeZone, loadWeek, loadRangeMeals, fetchWeightsAndGoal, refreshWeightsIfStale,
      refreshUserStable, handleMealDeleted, handleSave, handleWeightSave, handleDeleteWeight, openScan,
    ]);

  // Branded splash stays at least SPLASH_MIN_MS so startup never flashes,
  // then fades via SplashOverlay's `done` prop. Previously the layout passed
  // props the overlay doesn't accept (visible/onMinDone/onForcedDone), so
  // `done` was always undefined and the logo stayed forever.
  useEffect(() => {
    const timer = setTimeout(() => setSplashMinDone(true), SPLASH_MIN_MS);
    return () => clearTimeout(timer);
  }, []);

  // Request camera permissions early if not already asked (ref guard avoids setState-in-effect cascade)
  useEffect(() => {
    if (!cameraPermissionAskedRef.current && cameraPermission && !cameraPermission.granted) {
      cameraPermissionAskedRef.current = true;
      requestCameraPermission();
    }
  }, [cameraPermission, requestCameraPermission]);

  // Measured tab-bar height (reported by BottomNav onLayout): screens and
  // overlay sheets clear exactly this, so the last card never slides under
  // the bar or its protruding center button. Equality bail-out avoids loops.
  const handleNavHeight = useCallback((h) => {
    setNavHeight((prev) => (prev === h ? prev : h));
  }, []);

  // Native device back closes the camera overlay. It is state-rendered, not
  // a router screen, so the OS back press needs an explicit handler.
  // Sibling overlays handle themselves: ScanResultScreen owns its own
  // BackHandler, WeightLogSheet is a Modal (onRequestClose), and
  // QuickLogSheet owns its own.
  useEffect(() => {
    if (!scanMode) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setScanMode(null);
      return true;
    });
    return () => sub.remove();
  }, [scanMode]);

  // Render the layout
  return (
    <TabShellProvider value={tabShellValue}>
      <View style={{ flex: 1 }}>
        <Slot />
        <BottomNav
          onHeight={handleNavHeight}
          active={active}
          sheetOpen={sheetOpen}
          onChange={(key) => router.replace(`/(tabs)/${key}`)}
          onToggleSheet={() => setSheetOpen((v) => !v)}
        />
        {sheetOpen && (
          <QuickLogSheet
            onClose={() => setSheetOpen(false)}
            remaining={remainingToday}
            onLogFood={() => {
              setSheetOpen(false);
              router.replace('/(tabs)/meals');
            }}
            onScan={() => {
              setSheetOpen(false);
              openScan('scan');
            }}
            onLogWeight={() => {
              setSheetOpen(false);
              setLogWeightOpen(true);
            }}
          />
        )}
        {scanMode && (
          <View className="absolute inset-0" style={{ zIndex: 50 }}>
            <PictureUploadScreen
              initialMode={scanMode}
              onClose={() => setScanMode(null)}
              cameraPermission={cameraPermission}
              onResult={(result) => {
                setScanResult(result);
                setScanMode(null);
              }}
            />
          </View>
        )}
        {!scanMode && scanResult && (
          <View className="absolute inset-0" style={{ zIndex: 50 }}>
            <ScanResultScreen
              result={scanResult}
              onSave={async (meal) => {
                await handleSave(meal);
                setScanResult(null);
              }}
              onDone={() => setScanResult(null)}
            />
          </View>
        )}
        {logWeightOpen && <WeightLogSheet
          onClose={() => setLogWeightOpen(false)}
          onSave={handleWeightSave}
          latestWeight={latestWeight}
        />}
        <SplashOverlay done={splashMinDone} />
      </View>
    </TabShellProvider>
  );
}

