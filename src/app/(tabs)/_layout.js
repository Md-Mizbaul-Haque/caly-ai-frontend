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
import { dateKey } from '../../shared/utils/format';
import { toastSuccess, toastError } from '../../shared/utils/toast';
import { useSession } from '../../features/auth/session';
import { TabShellProvider } from '../../features/tabs/shell';
import { readCache, writeCache } from '../../shared/lib/appCache';

const SPLASH_MIN_MS = 450;

export default function TabsLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { user, authChecked, goal, setGoal } = useSession();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [navHeight, setNavHeight] = useState(0);
  const [showScan, setShowScan] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [pendingPhoto, setPendingPhoto] = useState(null);
  const [meals, setMeals] = useState([]); // current calendar week (dashboard view)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [weights, setWeights] = useState([]);
  const [weightGoal, setWeightGoalState] = useState(null);
  const [logWeightOpen, setLogWeightOpen] = useState(false);
  const [splashMinDone, setSplashMinDone] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [cameraPermissionAsked, setCameraPermissionAsked] = useState(false);
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

  const loadWeek = useCallback(async ({ silent } = {}) => {
    // Silent refreshes (background revalidation over cached data) must not
    // flip the UI back into its loading state.
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const mealsData = await fetchWeek(new Date());
      setMeals(mealsData);
      writeCache('weekMeals', mealsData);
    } catch (e) {
      // Error UI only appears when there's nothing cached to show.
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load meals for a horizon ending today (e.g. 365 days for the Progress
  // screen's daily-average card). Skipped when a wider horizon is already
  // loaded; results merge under the week view so both screens stay correct.
  const loadRangeMeals = useCallback(async (days) => {
    const end = new Date();
    const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - days);
    const from = dateKey(start);
    // A wider horizon already covers this one ??" nothing to fetch.
    if (rangeFromRef.current && rangeFromRef.current <= from) return;
    const data = await fetchMeals(from, dateKey(end));
    rangeFromRef.current = from;
    setRangeMeals(data);
  }, []);

  const fetchWeightsAndGoal = useCallback(async () => {
    if (!user) return;
    try {
      const [w, g] = await Promise.all([fetchWeights(), fetchWeightGoal()]);
      setWeights(w);
      setWeightGoalState(g);
      writeCache('weights', w);
      writeCache('weightGoal', g);
    } catch {
      // Offline / 403 (unverified) / server errors: keep cached data as-is
      // instead of an unhandled rejection that leaves state stale.
    }
  }, [user]);

  const hydratedForRef = useRef(null);
  const mealsHydratedRef = useRef(false);
  const weightsHydratedRef = useRef(false);

  useEffect(() => {
    if (!(authChecked && user)) return;
    const userKey = user._id || user.id || user.email;
    if (hydratedForRef.current === userKey) return;
    hydratedForRef.current = userKey;
    let alive = true;
    (async () => {
      const [cachedMeals, cachedWeights, cachedGoal] = await Promise.all([
        readCache('weekMeals'),
        readCache('weights'),
        readCache('weightGoal'),
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
      await Promise.all([loadWeek({ silent: true }), fetchWeightsAndGoal()]);
    })();
    return () => { alive = false; };
  }, [authChecked, user]);

  // Handle meal deletion
  const handleMealDeleted = useCallback(async (mealId) => {
    setMeals(prev => prev.filter(meal => meal.id !== mealId));
    toastSuccess('Meal deleted!');
  }, []);

  // Handle weight logging
  const handleWeightLogged = useCallback(async (weight) => {
    setWeights(prev => [...prev, weight]);
    toastSuccess('Weight logged!');
  }, []);

  // Save a meal (manual entry, catalog sheet, scan): POST then merge into the
  // week view so Dashboard/today totals update immediately. Throws so the
  // caller (sheet/form) can show the error inline instead of guessing.
  const handleSave = useCallback(async (meal) => {
    const saved = await createMeal(meal);
    setMeals((prev) => [...prev, saved]);
    toastSuccess('Meal logged!');
    return saved;
  }, []);

  // kcal remaining today for the quick-log sheet (today's meals only).
  const remainingToday = useMemo(() => {
    const key = dateKey(new Date());
    const todays = meals.filter((m) => {
      const d = new Date(m.loggedAt);
      return !Number.isNaN(d.getTime()) && dateKey(d) === key;
    });
    return Math.round(calcTotals(todays, goal).remaining);
  }, [meals, goal]);
  // Value to expose through TabShell context. Declared AFTER the handlers it
  // references — building it earlier reads the handler consts before
  // initialization (TDZ) and crashes the whole tab layout on first render.
  const tabShellValue = useMemo(() => ({
    loadWeek,
    setSheetOpen,
    deleteMeal: handleMealDeleted,
    handleSave,
    meals,
  }), [loadWeek, setSheetOpen, handleMealDeleted, handleSave, meals]);

  // Branded splash stays at least SPLASH_MIN_MS so startup never flashes,
  // then fades via SplashOverlay's `done` prop. Previously the layout passed
  // props the overlay doesn't accept (visible/onMinDone/onForcedDone), so
  // `done` was always undefined and the logo stayed forever.
  useEffect(() => {
    const timer = setTimeout(() => setSplashMinDone(true), SPLASH_MIN_MS);
    return () => clearTimeout(timer);
  }, []);

  // Request camera permissions early if not already asked
  useEffect(() => {
    if (!cameraPermissionAsked && cameraPermission) {
      setCameraPermissionAsked(true);
      if (!cameraPermission.granted) {
        requestCameraPermission();
      }
    }
  }, [cameraPermission, cameraPermissionAsked, requestCameraPermission]);

  // Handle scan result
  useEffect(() => {
    if (scanResult) {
      router.push(`/scan/result?result=${encodeURIComponent(JSON.stringify(scanResult))}`);
    }
  }, [scanResult, router]);

  // Handle navigation height changes
  useEffect(() => {
    const handleNavHeightChange = (height) => {
      setNavHeight(height);
    };

    // In a real app, you'd listen to navigation events
    // For now, we'll simulate it
    return () => {
      // Cleanup
    };
  }, []);

  // Render the layout
  return (
    <TabShellProvider value={tabShellValue}>
      <View style={{ flex: 1 }}>
        <Slot />
        <BottomNav
          navHeight={navHeight}
          active={active}
          sheetOpen={sheetOpen}
          onChange={(key) => router.push(`/(tabs)/${key}`)}
          onToggleSheet={() => setSheetOpen((v) => !v)}
        />
        {sheetOpen && (
          <QuickLogSheet
            onClose={() => setSheetOpen(false)}
            remaining={remainingToday}
            onLogFood={() => {
              setSheetOpen(false);
              router.push('/(tabs)/log');
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
          onClose={() => setLogWeightOpen(false)}
          onWeightLogged={handleWeightLogged}
        />}
        <SplashOverlay done={splashMinDone} />
      </View>
    </TabShellProvider>
  );
}

