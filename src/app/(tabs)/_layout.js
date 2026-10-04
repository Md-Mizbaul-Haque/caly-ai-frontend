import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import BottomNav from '../../shared/components/ui/BottomNav';
import QuickLogSheet from '../../shared/components/ui/QuickLogSheet';
import WeightLogSheet from '../../shared/components/WeightLogSheet';
import SplashOverlay from '../../shared/components/SplashOverlay';
import PictureUploadScreen from '../../features/scan/screens/PictureUploadScreen';
import ScanResultScreen from '../../features/scan/screens/ScanResultScreen';
import { fetchWeek, createMeal, deleteMealById } from '../../shared/lib/mealsApi';
import { fetchWeights, createWeight, fetchWeightGoal, setWeightGoal, deleteWeight } from '../../shared/lib/weightsApi';
import { calcTotals } from '../../shared/utils/totals';
import { dateKey } from '../../shared/utils/format';
import { toastSuccess, toastError } from '../../shared/utils/toast';
import { useSession } from '../../features/auth/session';
import { TabShellProvider } from '../../features/tabs/shell';

const SPLASH_MIN_MS = 600;
const SPLASH_MAX_MS = 4000;

export default function TabsLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { user, authChecked, goal, setGoal } = useSession();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [navHeight, setNavHeight] = useState(0);
  const [showScan, setShowScan] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [pendingPhoto, setPendingPhoto] = useState(null);
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [weights, setWeights] = useState([]);
  const [weightGoal, setWeightGoalState] = useState(null);
  const [logWeightOpen, setLogWeightOpen] = useState(false);
  const [splashMin, setSplashMin] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const snapshotRef = useRef([]);

  const active = segments[segments.length - 1] ?? 'dashboard';

  const loadWeek = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setMeals(await fetchWeek(new Date()));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (authChecked && user) loadWeek(); }, [authChecked, user, loadWeek]);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      try {
        const [w, g] = await Promise.all([fetchWeights(), fetchWeightGoal()]);
        if (alive) {
          setWeights(w);
          setWeightGoalState(g);
        }
      } catch {
        // Progress cards fall back to empty states when weight data can't load.
      }
    })();
    return () => {
      alive = false;
    };
  }, [user]);

  useEffect(() => {
    const minTimer = setTimeout(() => setSplashMin(true), SPLASH_MIN_MS);
    // Cap so a hanging fetch can never pin the splash over the app.
    const maxTimer = setTimeout(() => setSplashDone(true), SPLASH_MAX_MS);
    return () => {
      clearTimeout(minTimer);
      clearTimeout(maxTimer);
    };
  }, []);

  useEffect(() => {
    if (splashMin && !loading) setSplashDone(true);
  }, [splashMin, loading]);

  async function handleSave(meal) {
    const tempId = `temp-${Date.now()}`;
    const optimistic = { id: tempId, loggedAt: new Date().toISOString(), emoji: '🍽️', ...meal };
    setMeals(prev => [optimistic, ...prev]);
    router.replace('/(tabs)/dashboard');
    try {
      const saved = await createMeal({ ...meal, loggedAt: optimistic.loggedAt });
      setMeals(prev => prev.map(m => (m.id === tempId ? saved : m)));
      setPendingPhoto(null);
      toastSuccess('Meal logged', saved.name ?? meal.name);
    } catch (e) {
      setMeals(prev => prev.filter(m => m.id !== tempId));
      toastError("Couldn't save meal", e.message);
    }
  }

  function deleteMeal(id) {
    setMeals(prev => {
      snapshotRef.current = prev;
      return prev.filter(m => m.id !== id);
    });
    deleteMealById(id).catch(e => {
      setMeals(snapshotRef.current);
      toastError("Couldn't delete meal", e.message);
    });
  }

  function handleCapture(scanResult) {
    setScanResult(scanResult);
    setShowScan(false);
  }

  function handleSaveScan(meal) {
    const imageUrl = scanResult && scanResult.imageUri ? scanResult.imageUri : (pendingPhoto || undefined);
    setScanResult(null);
    setPendingPhoto(imageUrl || null);
    handleSave(imageUrl ? { ...meal, imageUrl } : meal);
  }

  function handleTabChange(next) {
    setSheetOpen(false);
    router.replace(`/(tabs)/${next}`);
  }

  async function handleLogWeight(payload) {
    const tempId = `temp-w-${Date.now()}`;
    const optimistic = { id: tempId, loggedAt: new Date().toISOString(), value: payload.value };
    const prevGoal = weightGoal;
    setWeights(prev => [...prev, optimistic]);
    if (payload.goal != null) setWeightGoalState(payload.goal);
    try {
      const saved = await createWeight({ value: payload.value });
      setWeights(prev => prev.map(w => (w.id === tempId ? saved : w)));
      if (payload.goal != null) await setWeightGoal(payload.goal);
    } catch (e) {
      setWeights(prev => prev.filter(w => w.id !== tempId));
      setWeightGoalState(prevGoal);
      throw e;
    }
  }

  async function handleDeleteWeight(id) {
    const prev = weights;
    setWeights(w => w.filter(x => (x.id || x._id) !== id));
    try {
      await deleteWeight(id);
      toastSuccess('Weight deleted', '');
    } catch (e) {
      setWeights(prev);
      toastError("Couldn't delete", e.message);
    }
  }

  const todayRemaining = Math.max(
    0,
    calcTotals(meals.filter(m => dateKey(m.loggedAt) === dateKey(new Date())), goal).remaining
  );

  const shell = {
    meals, goal, setGoal, loading, error, weights, weightGoal,
    loadWeek, deleteMeal, handleSave, handleCapture, handleSaveScan,
    handleTabChange, handleLogWeight, handleDeleteWeight,
    sheetOpen, setSheetOpen, logWeightOpen, setLogWeightOpen,
    showScan, setShowScan, scanResult, setScanResult,
    pendingPhoto, setPendingPhoto, todayRemaining,
  };

  return (
    <TabShellProvider value={shell}>
      <View className="flex-1 bg-white">
        <View className="flex-1">
          {showScan && !scanResult && (
            <PictureUploadScreen onClose={() => setShowScan(false)} onResult={handleCapture} />
          )}
          {scanResult && (
            <ScanResultScreen
              result={scanResult}
              onSave={handleSaveScan}
              onClose={() => { setScanResult(null); setShowScan(false); }}
            />
          )}
          {!showScan && !scanResult && (
            <Slot />
          )}
        </View>
        {!showScan && !scanResult && (
          <View onLayout={e => setNavHeight(e.nativeEvent.layout.height)}>
            <BottomNav
              active={active}
              onChange={handleTabChange}
              sheetOpen={sheetOpen}
              onToggleSheet={() => setSheetOpen(v => !v)}
            />
          </View>
        )}
        <SplashOverlay done={splashDone} />
      </View>
      {sheetOpen && (
        <QuickLogSheet
          bottomOffset={navHeight}
          remaining={todayRemaining}
          onClose={() => setSheetOpen(false)}
          onLogFood={() => handleTabChange('log')}
          onLogWeight={() => {
            setSheetOpen(false);
            setLogWeightOpen(true);
          }}
          onScan={() => {
            setSheetOpen(false);
            setShowScan(true);
          }}
        />
      )}
      {logWeightOpen && (
        <WeightLogSheet
          bottomOffset={navHeight}
          currentGoal={weightGoal}
          onClose={() => setLogWeightOpen(false)}
          onSave={handleLogWeight}
        />
      )}
    </TabShellProvider>
  );
}
