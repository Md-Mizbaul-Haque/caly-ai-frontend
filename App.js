import './global.css';
import { useState } from 'react';
import { View, Pressable } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Plus } from 'lucide-react-native';
import DashboardScreen from './src/screens/DashboardScreen';
import LogFoodScreen from './src/screens/LogFoodScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import BottomNav from './src/components/ui/BottomNav';
import { mockMeals } from './src/lib/mockMeals';
const tokens = require('./src/theme/tokens.js');

export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [meals, setMeals] = useState(mockMeals);
  const [goal, setGoal] = useState(2000);
  function handleSave(meal) {
    setMeals(prev => [{ id: Date.now().toString(), loggedAt: new Date().toISOString(), ...meal }, ...prev]);
    setTab('dashboard');
  }
  function deleteMeal(id) {
    setMeals(prev => prev.filter(m => m.id !== id));
  }
  return (
    <SafeAreaProvider>
    <SafeAreaView edges={['top']} className="flex-1 bg-cream">
      <View className="flex-1">
        {tab === 'dashboard' && <DashboardScreen meals={meals} goal={goal} onAdd={() => setTab('log')} onDelete={deleteMeal} />}
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
