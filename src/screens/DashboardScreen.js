import { ScrollView, View, Text } from 'react-native';
import Card from '../components/ui/Card';
import ProgressRing from '../components/ui/ProgressRing';
import MacroBar from '../components/ui/MacroBar';
import EmptyState from '../components/ui/EmptyState';
import { calcTotals } from '../utils/totals';
export default function DashboardScreen({ meals = [], goal = 2000, onAdd }) {
  const t = calcTotals(meals, goal);
  return (
    <ScrollView className="flex-1 bg-cream px-4 pt-12">
      <Text className="text-2xl font-bold text-ink">Hi 👋</Text>
      <Text className="text-muted mb-4">Today's progress</Text>
      <Card><ProgressRing eaten={t.eaten} goal={goal} /></Card>
      <View className="mt-4"><Card>
        <MacroBar label="Protein" grams={t.protein} target={120} color="#FF6B35" />
        <MacroBar label="Carbs" grams={t.carbs} target={250} color="#FACC15" />
        <MacroBar label="Fat" grams={t.fat} target={65} color="#22C55E" />
      </Card></View>
      <View className="mt-4 mb-24">
        {meals.length === 0
          ? <Card><EmptyState onCta={onAdd} /></Card>
          : meals.map(m => (
            <Card key={m.id} style={{ marginBottom: 12 }}>
              <Text className="font-bold text-ink">{m.name}</Text>
              <Text className="text-muted">{m.kcal} kcal • {m.mealType}</Text>
            </Card>
          ))}
      </View>
    </ScrollView>
  );
}
