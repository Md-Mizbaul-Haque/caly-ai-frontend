import './global.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Pressable } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Plus } from 'lucide-react-native';
import DashboardScreen from './src/screens/DashboardScreen';
import LogFoodScreen from './src/screens/LogFoodScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import BottomNav from './src/components/ui/BottomNav';
import { fetchWeek, createMeal, deleteMealById } from './src/lib/mealsApi';
const tokens = require('./src/theme/tokens.js');

export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [goal, setGoal] = useState(2000);
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

  async function handleSave(meal) {
    const tempId = `temp-${Date.now()}`;
    const optimistic = { id: tempId, loggedAt: new Date().toISOString(), emoji: '🍽️', ...meal };
    setMeals(prev => [optimistic, ...prev]);
    setTab('dashboard');
    try {
      const saved = await createMeal({ ...meal, loggedAt: optimistic.loggedAt });
      setMeals(prev => prev.map(m => (m.id === tempId ? saved : m)));
    } catch (e) {
      setMeals(prev => prev.filter(m => m.id !== tempId));
      setError(e.message);
    }
  }

  function deleteMeal(id) {
    setMeals(prev => {
      snapshotRef.current = prev;
      return prev.filter(m => m.id !== id);
    });
    deleteMealById(id).catch(e => {
      setMeals(snapshotRef.current);
      setError(e.message);
    });
  }

  return (
    <SafeAreaProvider>
    <SafeAreaView edges={['top']} className="flex-1 bg-cream">
      <View className="flex-1">
        {tab === 'dashboard' && (
          <DashboardScreen meals={meals} goal={goal} loading={loading} error={error} onRetry={loadWeek} onAdd={() => setTab('log')} onDelete={deleteMeal} />
        )}
        {tab === 'log' && <LogFoodScreen onSave={handleSave} />}
        {tab === 'history' && <HistoryScreen meals={meals} goal={goal} onAdd={() => setTab('log')} />}
        {tab === 'profile' && <ProfileScreen goal={goal} setGoal={setGoal} />}
        {tab !== 'log' && (
          <Pressable
            onPress={() => setTab('log')}
            accessibilityLabel="Log food"
            className="absolute right-5 bottom-6 w-14 h-14 rounded-full bg-primary items-center justify-center"
            style={{
              shadowColor: tokens.colors.primary,
              shadowOpacity: 0.4,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 6 },
              elevation: 8,
            }}
          >
            <Plus size={30} color="white" strokeWidth={2.5} />
          </Pressable>
        )}
      </View>
      <BottomNav active={tab} onChange={setTab} />
    </SafeAreaView>
    </SafeAreaProvider>
  );
}
