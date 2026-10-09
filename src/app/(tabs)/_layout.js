import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import BottomNav from '../../shared/components/ui/BottomNav';
import QuickLogSheet from '../../shared/components/ui/QuickLogSheet';
import WeightLogSheet from '../../shared/components/WeightLogSheet';
import SplashOverlay from '../../shared/components/SplashOverlay';
import PictureUploadScreen from '../../features/scan/screens/PictureUploadScreen';
import ScanResultScreen from '../../features/scan/screens/ScanResultScreen';
import { useCameraPermissions } from 'expo-camera';
import { fetchWeek, fetchMeals, createMeal, deleteMealById } from '../../shared/lib/mealsApi';
import { fetchWeights, createWeight, fetchWeightGoal, setWeightGoal, deleteWeight } from '../../shared/lib/weightsApi';
import { calcTotals } from '../../shared/utils/totals';
import { dateKey, effectiveTimeZone } from '../../shared/utils/format';
import { toastSuccess, toastError } from '../../shared/utils/toast';
import { useSession } from '../../features/auth/session';
import { TabShellProvider } from '../../features/tabs/shell';
import { readCache, writeCache, scopedKey, setCacheOwner } from '../../shared/lib/appCache';

const SPLASH_MIN_MS = 450;

export default function TabsLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { user, authChecked, goal, setGoal } = useSession();
  const userKey = user ? (user._id || user.id || user.email) : null;
  const [sheetOpen, setSheetOpen] = useState(false);
  const [navHeight, setNavHeight] = useState(0);
  const [showScan, setShowScan] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [pendingPhoto, setPendingPhoto] = useState(null);
  const [meals, setMeals] = useState([]); // current calendar week (dashboard view)
  // Always a valid Date from first render. The cached day is restored
  // asynchronously in the hydration effect below: readCache is async, and
  // new Date(promise) is an Invalid Date whose empty dateKey makes the day
  // strip rebuild its window on every render (infinite "Too many re-renders").
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [weights, setWeights] = useState([]);
  const [weightGoal, setWeightGoalState] = useState(null);
  const [logWeightOpen, setLogWeightOpen] = useState(false);
  const [splashMinDone, setSplashMinDone] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraPermissionAskedRef = useRef(false);
  const snapshotRef = useRef([]);

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

  const loadWeek = useCallback(async ({ silent, reference } = {}) => {
    // Silent refreshes (background revalidation over cached data) must not
    // flip the UI back into its loading state. `reference` selects which
    // calendar week to load (defaults to the current week) so the dashboard
    // can fetch the week containing the user-selected day.
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const mealsData = await fetchWeek(reference || new Date(), timeZone);
      setMeals(mealsData);
      writeCache(scopedKey('weekMeals', userKey), mealsData);
    } catch (e) {
      // Error UI only appears when there's nothing cached to show.
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [userKey, timeZone]);

   // Load meals for a horizon ending today (e.g. 365 days for the Progress
   // screen's daily-average card). Skipped when a wider horizon is already
   // loaded; results merge under the week view so both screens stay correct.
   const loadRangeMeals = useCallback(async (days) => {
     const end = new Date();
     const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - days);
     const from = dateKey(start, timeZone);
     // A wider horizon already covers this one ??" nothing to fetch.
     if (rangeFromRef.current && rangeFromRef.current <= from) return;
     const data = await fetchMeals(from, dateKey(end, timeZone), undefined, timeZone);
     rangeFromRef.current = from;
     setRangeMeals(data);
   }, [timeZone]);

   // Persist selectedDate to cache whenever it changes
   useEffect(() => {
     if (userKey) {
       writeCache(scopedKey('selectedDate', userKey), selectedDate.toISOString());
     }
   }, [selectedDate, userKey]);

  const fetchWeightsAndGoal = useCallback(async () => {
    if (!user) return;
    try {
      const [w, g] = await Promise.all([fetchWeights(), fetchWeightGoal()]);
      setWeights(w);
      setWeightGoalState(g);
      writeCache(scopedKey('weights', userKey), w);
      writeCache(scopedKey('weightGoal', userKey), g);
    } catch {
      // Offline / 403 (unverified) / server errors: keep cached data as-is
      // instead of an unhandled rejection that leaves state stale.
    }
  }, [user, userKey]);

  const hydratedForRef = useRef(null);
  const mealsHydratedRef = useRef(false);
  const weightsHydratedRef = useRef(false);

  useEffect(() => {
    if (!(authChecked && user)) return;
    const key = user._id || user.id || user.email;
    if (hydratedForRef.current === key) return;
    hydratedForRef.current = key;
    // New account (login / switch): drop the previous owner's in-memory
    // state first so their meals/weights never flash, then hydrate from
    // that owner's namespaced cache while the network revalidates.
    setCacheOwner(key);
    setMeals([]);
    setRangeMeals([]);
    setWeights([]);
    setWeightGoalState(null);
    setSelectedDate(new Date());
    setError(null);
    setLoading(true);
    rangeFromRef.current = null;
    let alive = true;
    (async () => {
      const [cachedMeals, cachedWeights, cachedGoal, cachedDate] = await Promise.all([
        readCache(scopedKey('weekMeals', key)),
        readCache(scopedKey('weights', key)),
        readCache(scopedKey('weightGoal', key)),
        readCache(scopedKey('selectedDate', key)),
      ]);
      if (!alive) return;
      mealsHydratedRef.current = true;
      weightsHydratedRef.current = true;
      if (cachedMeals) {
        setMeals(cachedMeals);
        setLoading(false);
      }
      if (cachedWeights) setWeights(cachedWeights);
      if (cachedGoal !== null) setWeightGoalState(cachedGoal);
      if (cachedDate) {
        const d = new Date(cachedDate);
        // Corrupt cache must never resurrect an Invalid Date (see above).
        if (!Number.isNaN(d.getTime())) {
          setSelectedDate((prev) => (dateKey(prev, timeZone) === dateKey(d, timeZone) ? prev : d));
        }
      }
      await Promise.all([loadWeek({ silent: true }), fetchWeightsAndGoal()]);
    })();
    return () => { alive = false; };
  }, [authChecked, user]);

  // Handle meal deletion: persist via API, then drop from both the week
  // view and the long-horizon range so Dashboard + Progress stay in sync.
  // Rolls back on failure so the row never silently vanishes.
  const handleMealDeleted = useCallback(async (mealId) => {
    const id = String(mealId);
    const prevWeek = meals;
    const prevRange = rangeMeals;
    setMeals(prevWeek.filter((meal) => String(meal.id) !== id));
    setRangeMeals(prevRange.filter((meal) => String(meal.id || meal._id) !== id));
    try {
      await deleteMealById(mealId);
      toastSuccess('Meal deleted!');
    } catch (e) {
      setMeals(prevWeek);
      setRangeMeals(prevRange);
      toastError('Could not delete', e.message);
      throw e;
    }
  }, [meals, rangeMeals]);

  // Handle weight logging via WeightLogSheet's onSave({ value, goal? }):
  // persists the goal first (separate PUT), then POSTs the weight and
  // merges the result (same-day re-logs replace in place).
  const handleWeightSave = useCallback(async ({ value, goal: goalValue } = {}) => {
    if (goalValue !== undefined && goalValue !== null && Number(goalValue) !== Number(weightGoal)) {
      const savedGoal = await setWeightGoal(goalValue);
      setWeightGoalState(savedGoal);
      writeCache(scopedKey('weightGoal', userKey), savedGoal);
    }
    const { weight, updated } = await createWeight({ value });
    const wid = String(weight.id || weight._id);
    const next = updated && weights.some((w) => String(w.id || w._id) === wid)
      ? weights.map((w) => (String(w.id || w._id) === wid ? weight : w))
      : [...weights, weight];
    setWeights(next);
    writeCache(scopedKey('weights', userKey), next);
    toastSuccess('Weight logged!');
    return weight;
  }, [userKey, weightGoal, weights]);

  const handleDeleteWeight = useCallback(async (weightId) => {
    const id = String(weightId);
    const prev = weights;
    setWeights(prev.filter((x) => String(x.id || x._id) !== id));
    try {
      await deleteWeight(weightId);
      toastSuccess('Weight entry deleted!');
    } catch (e) {
      setWeights(prev);
      toastError('Could not delete', e.message);
      throw e;
    }
  }, [weights]);

  // Save a meal (manual entry, catalog sheet, scan): POST then merge into the
  // week view so Dashboard/today totals update immediately. Stamps the
  // client-side loggedAt (ISO with offset) when callers omit it so the meal
  // lands on the device's calendar day instead of the server clock's.
  // Throws so the caller (sheet/form) can show the error inline instead of guessing.
  const handleSave = useCallback(async (meal) => {
    const payload = meal && meal.loggedAt ? meal : { ...meal, loggedAt: new Date().toISOString() };
    const saved = await createMeal(payload);
    setMeals((prev) => [...prev, saved]);
    setRangeMeals((prev) => {
      const id = String(saved.id || saved._id);
      if (prev.some((m) => String(m.id || m._id) === id)) return prev;
      return [...prev, saved];
    });
    toastSuccess('Meal logged!');
    return saved;
  }, []);

  const latestWeight = useMemo(() => {
    let best = null;
    for (const w of weights) {
      const t = new Date(w.loggedAt).getTime();
      if (Number.isNaN(t)) continue;
      if (!best || t >= best.t) best = { t, value: w.value };
    }
    return best ? best.value : null;
  }, [weights]);
  // kcal remaining today for the quick-log sheet (today's meals only).
  const remainingToday = useMemo(() => {
    const key = dateKey(new Date(), timeZone);
    const todays = meals.filter((m) => {
      const d = new Date(m.loggedAt);
      return !Number.isNaN(d.getTime()) && dateKey(d, timeZone) === key;
    });
    return Math.round(calcTotals(todays, goal).remaining);
  }, [meals, goal, timeZone]);
   // Value to expose through TabShell context. Declared AFTER the handlers it
   // references — building it earlier reads the handler consts before
   // initialization (TDZ) and crashes the whole tab layout on first render.
   // Must stay in sync with what DashboardScreen / ProgressScreen consume:
   // progressCache + goal/loading/error, week + range meals, weights + goal,
   // selectedDate, and every handler the routes pass down as props.
   const tabShellValue = useMemo(() => ({
     progressCache,
     goal,
     loading,
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
     fetchWeightsAndGoal,
     setSheetOpen,
     setLogWeightOpen,
     deleteMeal: handleMealDeleted,
     handleSave,
     handleWeightSave,
     handleDeleteWeight,
   }), [
     progressCache, goal, loading, error, meals, rangeMeals, weights, weightGoal,
     selectedDate, setSelectedDate, navHeight, timeZone, loadWeek, loadRangeMeals, fetchWeightsAndGoal,
     handleMealDeleted, handleSave, handleWeightSave, handleDeleteWeight,
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

  // Handle scan result
  useEffect(() => {
    if (scanResult) {
      router.push(`/scan/result?result=${encodeURIComponent(JSON.stringify(scanResult))}`);
    }
  }, [scanResult, router]);

  // Measured tab-bar height (reported by BottomNav onLayout): screens and
  // overlay sheets clear exactly this, so the last card never slides under
  // the bar or its protruding center button. Equality bail-out avoids loops.
  const handleNavHeight = useCallback((h) => {
    setNavHeight((prev) => (prev === h ? prev : h));
  }, []);

  // Render the layout
  return (
    <TabShellProvider value={tabShellValue}>
      <View style={{ flex: 1 }}>
        <Slot />
        <BottomNav
          onHeight={handleNavHeight}
          active={active}
          sheetOpen={sheetOpen}
          onChange={(key) => router.push(`/(tabs)/${key}`)}
          onToggleSheet={() => setSheetOpen((v) => !v)}
        />
        {sheetOpen && (
          <QuickLogSheet
            bottomOffset={navHeight}
            onClose={() => setSheetOpen(false)}
            remaining={remainingToday}
            onLogFood={() => {
              setSheetOpen(false);
              router.push('/(tabs)/meals');
            }}
            onScan={() => {
              setSheetOpen(false);
              setShowScan(true);
            }}
            onLogWeight={() => {
              setSheetOpen(false);
              setLogWeightOpen(true);
            }}
          />
        )}
        {showScan && (
          <View className="absolute inset-0" style={{ zIndex: 50 }}>
            <PictureUploadScreen
              onClose={() => setShowScan(false)}
              cameraPermission={cameraPermission}
              onResult={(result) => {
                setScanResult(result);
                setShowScan(false);
              }}
            />
          </View>
        )}
        {!showScan && scanResult && (
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
          bottomOffset={navHeight}
          onClose={() => setLogWeightOpen(false)}
          onSave={handleWeightSave}
          currentGoal={weightGoal}
          latestWeight={latestWeight}
        />}
        <SplashOverlay done={splashMinDone} />
      </View>
    </TabShellProvider>
  );
}

