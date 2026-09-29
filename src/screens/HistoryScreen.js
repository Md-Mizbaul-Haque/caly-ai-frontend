import { ScrollView, Text, View } from 'react-native';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import { calcTotals } from '../utils/totals';
export default function HistoryScreen({ meals = [], goal = 2000, onAdd }) {
  const t = calcTotals(meals, goal);
  const days = ['M','T','W','T','F','S','S'];
  return (
    <ScrollView className="flex-1 bg-cream px-4 pt-12">
      <Text className="text-2xl font-bold text-ink mb-4">History</Text>
      <View className="flex-row mb-4">{days.map((d,i) => <Text key={i} className={`flex-1 text-center py-2 rounded-full ${i===6 ? 'bg-primary text-white font-bold' : 'text-muted'}`}>{d}</Text>)}</View>
      <Card><Text className="font-bold text-ink">Today: {t.eaten} kcal</Text></Card>
      <View className="mt-4 mb-24">
        {meals.length === 0 ? <Card><EmptyState onCta={onAdd} /></Card> :
          meals.map(m => <Card key={m.id} style={{marginBottom:12}}><Text className="font-bold">{m.name}</Text><Text className="text-muted">{m.kcal} kcal</Text></Card>)}
      </View>
    </ScrollView>
  );
}
