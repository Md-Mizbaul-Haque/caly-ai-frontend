import './global.css';
import { useState } from 'react';
import { View, Pressable, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DashboardScreen from './src/screens/DashboardScreen';
import LogFoodScreen from './src/screens/LogFoodScreen';
import { mockMeals } from './src/lib/mockMeals';
const TABS = ['dashboard','log','history','profile'];
export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [meals, setMeals] = useState(mockMeals);
  const [goal] = useState(2000);
  function handleSave(meal) {
    setMeals(prev => [{ id: Date.now().toString(), loggedAt: new Date().toISOString(), ...meal }, ...prev]);
    setTab('dashboard');
  }
  return (
    <SafeAreaView className="flex-1 bg-cream">
      <View className="flex-1">
        {tab === 'dashboard' && <DashboardScreen meals={meals} goal={goal} onAdd={() => setTab('log')} />}
        {tab === 'log' && <LogFoodScreen onSave={handleSave} />}
        {(tab === 'history' || tab === 'profile') && <View className="flex-1 items-center justify-center"><Text className="text-muted">Coming in next task: {tab}</Text></View>}
      </View>
      <View className="flex-row border-t border-[#F1E8E0] bg-white pb-6 pt-2">
        {TABS.map(t => (
          <Pressable key={t} onPress={() => setTab(t)} className="flex-1 items-center">
            <Text className={tab === t ? 'text-primary font-bold capitalize' : 'text-muted capitalize'}>{t}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}
