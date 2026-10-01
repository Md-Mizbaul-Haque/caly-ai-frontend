import './global.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import DashboardScreen from './src/screens/DashboardScreen';
import LogFoodScreen from './src/screens/LogFoodScreen';
import ProgressScreen from './src/screens/ProgressScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import AuthScreen from './src/screens/AuthScreen';
import PictureUploadScreen from './src/screens/PictureUploadScreen';
import ScanResultScreen from './src/screens/ScanResultScreen';
import BottomNav from './src/components/ui/BottomNav';
import QuickLogSheet from './src/components/ui/QuickLogSheet';
import ThemedToast from './src/components/ui/ThemedToast';
import SplashOverlay from './src/components/SplashOverlay';
import { fetchWeek, createMeal, deleteMealById } from './src/lib/mealsApi';
import { fetchWeights, createWeight, fetchWeightGoal, setWeightGoal, deleteWeight } from './src/lib/weightsApi';
import { fetchMe } from './src/lib/authApi';
import { getToken, setSessionExpiredHandler } from './src/lib/tokenStore';
import WeightLogSheet from './src/components/WeightLogSheet';
import { calcTotals } from './src/utils/totals';
import { dateKey } from './src/utils/format';
import { toastSuccess, toastError } from './src/utils/toast';

const SPLASH_MIN_MS = 600;
const SPLASH_MAX_MS = 4000;

export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [navHeight, setNavHeight] = useState(0);
  const [showScan, setShowScan] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [pendingPhoto, setPendingPhoto] = useState(null);
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [goal, setGoal] = useState(2000);
  const [weights, setWeights] = useState([]);
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [weightGoal, setWeightGoalState] = useState(null);
  const [logWeightOpen, setLogWeightOpen] = useState(false);
  const [splashMin, setSplashMin] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const snapshotRef = useRef([]);

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

  useEffect(() => { loadWeek(); }, [loadWeek]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setSessionExpiredHandler(() => { if (alive) setUser(null); });
      const t = await getToken();
      if (!t) { if (alive) setAuthChecked(true); return; }
      try {
        const data = await fetchMe();
        if (alive) {
          setUser(data.user);
          if (data.user && data.user.dailyGoalKcal) setGoal(data.user.dailyGoalKcal);
        }
      } catch { if (alive) setUser(null); }
      finally { if (alive) setAuthChecked(true); }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
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
  }, []);

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
    setTab('dashboard');
    try {
      const saved = await createMeal({ ...meal, loggedAt: optimistic.loggedAt });
      setMeals(prev => prev.map(m => (m.id === tempId ? saved : m)));
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
    setTab(next);
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

  if (!authChecked) return null;
  if (!user) return (
    <SafeAreaProvider>
    <SafeAreaView edges={['top']} className="flex-1 bg-cream">
      <AuthScreen onAuthed={(u) => { setUser(u); if (u && u.dailyGoalKcal) setGoal(u.dailyGoalKcal); loadWeek(); }} />
      <ThemedToast />
    </SafeAreaView>
    </SafeAreaProvider>
  );

  return (
    <SafeAreaProvider>
    <SafeAreaView edges={['top']} className="flex-1 bg-cream">
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
          <>
        {tab === 'dashboard' && (
          <DashboardScreen meals={meals} goal={goal} loading={loading} error={error} onRetry={loadWeek} onAdd={() => setSheetOpen(true)} onDelete={deleteMeal} />
        )}
        {tab === 'log' && <LogFoodScreen onSave={handleSave} photo={pendingPhoto} onRemovePhoto={() => setPendingPhoto(null)} />}
        {tab === 'history' && (
          <ProgressScreen
            weights={weights}
            weightGoal={weightGoal}
            onLogWeight={() => setLogWeightOpen(true)}
            onRetry={loadWeek}
            onDeleteWeight={handleDeleteWeight}
          />
        )}
        {tab === 'profile' && <ProfileScreen goal={goal} setGoal={setGoal} />}
          </>
        )}
      </View>
      {!showScan && !scanResult && (
        <View onLayout={e => setNavHeight(e.nativeEvent.layout.height)}>
          <BottomNav
            active={tab}
            onChange={handleTabChange}
            sheetOpen={sheetOpen}
            onToggleSheet={() => setSheetOpen(v => !v)}
          />
        </View>
      )}
      <SplashOverlay done={splashDone} />
    </SafeAreaView>
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
    <ThemedToast />
    </SafeAreaProvider>
  );
}
