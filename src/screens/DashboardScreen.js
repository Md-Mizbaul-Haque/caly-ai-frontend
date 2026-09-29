import { useMemo, useState } from 'react';
import { ScrollView, View, Text, ActivityIndicator, useWindowDimensions } from 'react-native';
import { Beef, Wheat, Droplet } from 'lucide-react-native';
import Card from '../components/ui/Card';
import ProgressRing from '../components/ui/ProgressRing';
import MacroCard from '../components/ui/MacroCard';
import EmptyState from '../components/ui/EmptyState';
import DaySelector from '../components/dashboard/DaySelector';
import MealRow from '../components/dashboard/MealRow';
import { calcTotals } from '../utils/totals';
import { dateKey } from '../utils/format';
import PrimaryButton from '../components/ui/Button';
const tokens = require('../theme/tokens.js');

const MACROS = [
  { key: 'protein', label: 'Protein', target: 120, color: '#FF6B35', icon: Beef },
  { key: 'carbs', label: 'Carbs', target: 250, color: '#FACC15', icon: Wheat },
  { key: 'fat', label: 'Fat', target: 65, color: '#22C55E', icon: Droplet },
];

export default function DashboardScreen({ meals = [], goal = 2000, loading = false, error = null, onRetry, onAdd, onDelete }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [macroIndex, setMacroIndex] = useState(0);
  const { width } = useWindowDimensions();

  const dayMeals = useMemo(
    () => meals.filter(m => dateKey(m.loggedAt) === dateKey(selectedDate)),
    [meals, selectedDate]
  );
  const t = calcTotals(dayMeals, goal);

  const totalsByDate = useMemo(() => {
    const grouped = {};
    for (const m of meals) {
      const k = dateKey(m.loggedAt);
      if (!k) continue;
      (grouped[k] ||= []).push(m);
    }
    const out = {};
    for (const [k, list] of Object.entries(grouped)) out[k] = calcTotals(list, goal);
    return out;
  }, [meals, goal]);

  const contentWidth = Math.min(width, 480) - 32;
  const cardWidth = Math.max(100, Math.floor((contentWidth - 16) / 3));
  const snapInterval = cardWidth + 8;

  return (
    <ScrollView
      className="flex-1 bg-cream"
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 96 }}
    >
      <View style={{ width: '100%', maxWidth: 480, alignSelf: 'center' }}>
        <View className="flex-row items-center">
          <Text className="text-lg font-bold text-ink">Caly AI</Text>
          <View className="flex-1" />
        </View>

        {loading && meals.length === 0 && (
          <View className="items-center justify-center py-16">
            <ActivityIndicator size="large" color={tokens.colors.primary} />
            <Text className="text-sm text-muted mt-3">Loading your week…</Text>
          </View>
        )}
        {error && meals.length === 0 && !loading && (
          <Card style={{ marginTop: 4 }}>
            <Text className="font-bold text-ink mb-1">Couldn't load meals</Text>
            <Text className="text-sm text-muted mb-3">{error}</Text>
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
                <Text className="text-lg font-semibold text-muted">/{goal}</Text>
              </View>
              <Text className="text-sm text-muted mt-1">Calories eaten</Text>
            </View>
            <ProgressRing eaten={t.eaten} goal={goal} size={92} strokeWidth={10}>
              <Text className="text-2xl">🔥</Text>
            </ProgressRing>
          </View>
        </Card>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={snapInterval}
          decelerationRate="fast"
          className="mt-4"
          contentContainerStyle={{ gap: 8 }}
          onScroll={e => {
            const idx = Math.round(e.nativeEvent.contentOffset.x / snapInterval);
            const clamped = Math.min(MACROS.length - 1, Math.max(0, idx));
            if (clamped !== macroIndex) setMacroIndex(clamped);
          }}
          scrollEventThrottle={16}
        >
          {MACROS.map(m => (
            <MacroCard
              key={m.key}
              label={m.label}
              grams={t[m.key]}
              target={m.target}
              color={m.color}
              icon={m.icon}
              style={{ width: cardWidth }}
            />
          ))}
        </ScrollView>

        <View className="flex-row justify-center mt-3" style={{ gap: 6 }}>
          {MACROS.map((m, i) => (
            <View key={m.key} className={`h-1.5 rounded-full ${i === macroIndex ? 'w-4 bg-primary' : 'w-1.5 bg-[#F1E8E0]'}`} />
          ))}
        </View>

        <Text className="text-base font-bold text-ink mt-6 mb-3">Recently uploaded</Text>
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
