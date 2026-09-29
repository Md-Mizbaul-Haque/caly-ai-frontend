import './global.css';
import { useState } from 'react';
import { View, Pressable, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DashboardScreen from './src/screens/DashboardScreen';
const TABS = ['dashboard','log','history','profile'];
export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [meals] = useState([{ id: '1', name: 'Oatmeal + banana', kcal: 320, protein: 10, carbs: 60, fat: 6, mealType: 'Breakfast' }]);
  const [goal] = useState(2000);
  return (
    <SafeAreaView className="flex-1 bg-cream">
      <View className="flex-1">
        {tab === 'dashboard' && <DashboardScreen meals={meals} goal={goal} onAdd={() => setTab('log')} />}
        {tab !== 'dashboard' && <View className="flex-1 items-center justify-center"><Text className="text-muted">Coming in next task: {tab}</Text></View>}
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
