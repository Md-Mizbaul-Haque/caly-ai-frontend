import { useEffect, useMemo, useRef, useState } from 'react';
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
import { weekRange } from '../../../shared/lib/mealsApi';
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

export default function DashboardScreen({
  meals: mealsProp,
  goal: goalProp,
  loading: loadingProp,
  error: errorProp,
  weightGoal: weightGoalProp,
  timeZone: timeZoneProp,
  onRetry,
  onAdd,
  onDelete,
}) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const s = useTabShell();
  const isFocused = useIsFocused();

  // Props win; context (TabShell) is the fallback so the screen works both
  // under the tab layout and in isolation. Previously this read only
  // s.progressCache, which the provider never supplied -> always empty.
  const timeZone = timeZoneProp ?? s.timeZone;
  // Memoized so downstream useMemo deps stay referentially stable.
  const meals = useMemo(
    () => mealsProp ?? s.progressCache?.meals ?? s.meals ?? [],
    [mealsProp, s],
  );
  const goal = goalProp ?? s.goal ?? 2000;
  const loading = loadingProp ?? s.loading ?? false;
  const error = errorProp ?? s.error ?? null;
  const weightGoal = weightGoalProp ?? s.progressCache?.weightGoal ?? s.weightGoal ?? null;
  void weightGoal;

  // Load the calendar week containing the selected day. Without this, days
  // outside the initially fetched current week could never show data.
  // The loaded-week guard includes the zone: switching zones refetches.
  const loadedWeekRef = useRef(null);
  useEffect(() => {
    const { from } = weekRange(selectedDate, timeZone);
    const weekId = `${from}|${timeZone ?? ''}`;
    if (loadedWeekRef.current === weekId) return;
    loadedWeekRef.current = weekId;
    s.loadWeek?.({ reference: selectedDate, silent: true })?.catch?.(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, timeZone]);
  
   const MACROS = useMemo(() => macroTargets(goal), [goal]);

  const dayMeals = useMemo(
    () => {
      if (!isFocused) return [];
      return meals.filter(m => dateKey(m.loggedAt, timeZone) === dateKey(selectedDate, timeZone));
    },
    [meals, selectedDate, isFocused, timeZone]
  );
  
  const t = useMemo(() => {
    if (!isFocused) return { eaten: 0, protein: 0, carbs: 0, fat: 0, remaining: 0 };
    return calcTotals(dayMeals, goal);
  }, [dayMeals, goal, isFocused]);

   const totalsByDate = useMemo(() => {
     if (!isFocused) return {};
     const accum = {};
      for (const m of meals) {
        const k = dateKey(m.loggedAt, timeZone);
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
    }, [meals, goal, isFocused, timeZone]);

  async function handleRefresh() {
    try {
      if (onRetry) await onRetry();
      else await s.loadWeek?.({ reference: selectedDate }); // Refresh meals data
      await s.refreshWeights?.(); // Refresh weights and goal
    } catch (err) {
      console.error('Refresh failed:', err);
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 96 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={handleRefresh} />}
    >
      <View style={{ width: '100%', maxWidth: 480, alignSelf: 'center' }}>
        <View className="flex-row items-center">
          <Text className="text-lg font-bold text-ink">Caly AI</Text>
          <View className="flex-1" />
        </View>

        {loading && meals.length === 0 && (
          <View className="items-center justify-center py-16">
            <ActivityIndicator size="large" color={'#f2470c'} />
            <Text className="text-sm text-muted-foreground mt-3">Loading your week…</Text>
          </View>
        )}
        {error && meals.length === 0 && !loading && (
          <Card style={{ marginTop: 4 }}>
            <Text className="font-bold text-ink mb-1">{"Couldn't load meals"}</Text>
            <Text className="text-sm text-muted-foreground mb-3">{error}</Text>
            <PrimaryButton title="Retry" onPress={onRetry} />
          </Card>
        )}

        <View className="mt-4">
          <DaySelector selected={selectedDate} onSelect={setSelectedDate} totalsByDate={totalsByDate} goal={goal} timeZone={timeZone} />
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