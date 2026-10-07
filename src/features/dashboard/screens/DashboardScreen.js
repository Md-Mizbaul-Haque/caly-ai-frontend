import { useMemo, useState } from 'react';
import { ScrollView, View, Text, ActivityIndicator, RefreshControl } from 'react-native';
import { Beef, Wheat, Droplet } from '../../../shared/components/ui/icons';
import Card from '../../../shared/components/ui/Card';
import ProgressRing from '../../../shared/components/ui/ProgressRing';
import MacroCard from '../../../shared/components/ui/MacroCard';
import EmptyState from '../../../shared/components/ui/EmptyState';
import DaySelector from '../../../shared/components/dashboard/DaySelector';
import MealRow from '../../../shared/components/dashboard/MealRow';
import { calcTotals } from '../../../shared/utils/totals';
import { dateKey } from '../../../shared/utils/format';
import PrimaryButton from '../../../shared/components/ui/Button';
import { useIsFocused } from 'expo-router/react-navigation';
import { useTabShell } from '../../tabs/shell';

function macroTargets(goal) {
  return [
    { key: 'protein', label: 'Protein', target: Math.round(goal * 0.25 / 4), color: '#f2470c', icon: Beef },
    { key: 'carbs', label: 'Carbs', target: Math.round(goal * 0.50 / 4), color: '#FACC15', icon: Wheat },
    { key: 'fat', label: 'Fat', target: Math.round(goal * 0.25 / 9), color: '#22C55E', icon: Droplet },
  ];
}

export default function DashboardScreen({ onRetry, onAdd, onDelete }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const s = useTabShell();
  const isFocused = useIsFocused();
  
  // Extract data from progressCache with fallbacks
  const { meals = [], weightGoal = null } = s.progressCache || {};
  const { goal = 2000, loading, error } = s; // Get goal directly from shell, loading/error from shell state
  
   const MACROS = useMemo(() => macroTargets(goal), [goal]);

  const dayMeals = useMemo(
    () => {
      if (!isFocused) return [];
      return meals.filter(m => dateKey(m.loggedAt) === dateKey(selectedDate));
    },
    [meals, selectedDate, isFocused]
  );
  
  const t = useMemo(() => {
    if (!isFocused) return { eaten: 0, protein: 0, carbs: 0, fat: 0, remaining: 0 };
    return calcTotals(dayMeals, goal);
  }, [dayMeals, goal, isFocused]);

   const totalsByDate = useMemo(() => {
     if (!isFocused) return {};
     const accum = {};
     for (const m of meals) {
       const k = dateKey(m.loggedAt);
       if (!k) continue;
       if (!accum[k]) {
         accum[k] = { eaten: 0, protein: 0, carbs: 0, fat: 0 };
       }
       accum[k].eaten += Number(m.kcal) || 0;
       accum[k].protein += Number(m.protein) || 0;
       accum[k].carbs += Number(m.carbs) || 0;
       accum[k].fat += Number(m.fat) || 0;
     }
     const out = {};
     for (const [k, totals] of Object.entries(accum)) {
       out[k] = {
         ...totals,
         remaining: Math.max(0, goal - totals.eaten),
       };
     }
     return out;
   }, [meals, goal, isFocused]);

  async function handleRefresh() {
    try {
      if (onRetry) await onRetry();
      await s.loadWeek(); // Refresh meals data
      await s.refreshWeights(); // Refresh weights and goal
    } catch (err) {
      console.error('Refresh failed:', err);
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 96 }}
      refreshControl={<RefreshControl refreshing={s.loading} onRefresh={handleRefresh} />}
    >
      <View style={{ width: '100%', maxWidth: 480, alignSelf: 'center' }}>
        <View className="flex-row items-center">
          <Text className="text-lg font-bold text-ink">Caly AI</Text>
          <View className="flex-1" />
        </View>

        {s.loading && meals.length === 0 && (
          <View className="items-center justify-center py-16">
            <ActivityIndicator size="large" color={'#f2470c'} />
            <Text className="text-sm text-muted-foreground mt-3">Loading your week…</Text>
          </View>
        )}
        {error && meals.length === 0 && !s.loading && (
          <Card style={{ marginTop: 4 }}>
            <Text className="font-bold text-ink mb-1">{"Couldn't load meals"}</Text>
            <Text className="text-sm text-muted-foreground mb-3">{error}</Text>
            <PrimaryButton title="Retry" onPress={onRetry} />
          </Card>
        )}

        <View className="mt-4">
          <DaySelector selected={selectedDate} onSelect={setSelectedDate} totalsByDate={totalsByDate} goal={goal} />
        </View>

        <Card style={{ marginTop: 16 }}>
          <View className="flex-row items-center">
            <View className="flex-1 pr-2">
              <View className="flex-row items-baseline">
                <Text className="text-5xl font-extrabold text-ink">{t.eaten}</Text>
                <Text className="text-lg font-semibold text-muted-foreground">/{goal}</Text>
              </View>
              <Text className="text-sm text-muted-foreground mt-1">Calories eaten</Text>
            </View>
            <ProgressRing eaten={t.eaten} goal={goal} size={92} strokeWidth={10}>
              <Text className="text-2xl">🔥</Text>
            </ProgressRing>
          </View>
        </Card>

        <View className="flex-row mt-4" style={{ gap: 8 }}>
          {MACROS.map(m => (
            <MacroCard
              key={m.key}
              label={m.label}
              grams={t[m.key]}
              target={m.target}
              color={m.color}
              icon={m.icon}
              style={{ flex: 1 }}
            />
          ))}
        </View>

        <Text className="text-base font-bold text-ink mt-6 mb-3">{"Today's Meals"}</Text>
        {dayMeals.length === 0 ? (
          <Card>
            <EmptyState onCta={onAdd} />
          </Card>
        ) : (
          <View style={{ gap: 12 }}>
            {dayMeals.map(m => (
              <MealRow key={m.id} meal={m} onDelete={onDelete} />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}