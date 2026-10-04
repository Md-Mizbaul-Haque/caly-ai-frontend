import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View, RefreshControl } from 'react-native';
import Card from '../shared/components/ui/Card';
import Chip from '../shared/components/ui/Chip';
import PrimaryButton from '../shared/components/ui/Button';
import WeightChart from '../shared/components/WeightChart';
import { ArrowRight, Flame, Pencil, Scale, Target, TrendingDown, TrendingUp } from '../shared/components/ui/icons';
import { fetchMeals } from '../shared/lib/mealsApi';
import { dateKey } from '../shared/utils/format';

const RANGES = [
  { key: '90D', days: 90 },
  { key: '6M', months: 6 },
  { key: '1Y', months: 12 },
  { key: 'ALL' },
];

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MEALS_FROM = '2020-01-01';

function rangeStart(rangeKey) {
  const now = new Date();
  const r = RANGES.find(x => x.key === rangeKey);
  if (!r || (!r.days && !r.months)) return null;
  return r.days
    ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - r.days)
    : new Date(now.getFullYear(), now.getMonth() - r.months, now.getDate());
}

export default function ProgressScreen({ weights = [], weightGoal = null, onLogWeight, onRetry, onDeleteWeight }) {
  const [range, setRange] = useState('6M');
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const to = dateKey(new Date());
      const data = await fetchMeals(MEALS_FROM, to);
      setMeals(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!alive) return;
      await load();
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      if (onRetry) await onRetry();
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  const entries = useMemo(
    () =>
      weights
        .map(w => ({ id: w.id || w._id, date: new Date(w.loggedAt), value: Number(w.value) }))
        .filter(w => !Number.isNaN(w.date.getTime()) && Number.isFinite(w.value))
        .sort((a, b) => a.date - b.date),
    [weights]
  );

  const latest = entries.length ? entries[entries.length - 1] : null;

  const start = useMemo(() => rangeStart(range), [range]);
  const rangeEntries = start ? entries.filter(e => e.date >= start) : entries;
  const [chartW, setChartW] = useState(0);

  const goalPct = useMemo(() => {
    if (weightGoal == null || rangeEntries.length < 2) return null;
    const first = rangeEntries[0].value;
    const current = rangeEntries[rangeEntries.length - 1].value;
    const denom = Number(weightGoal) - first;
    if (!denom) return null;
    const pct = Math.round(((current - first) / denom) * 100);
    return Math.min(100, Math.max(0, pct));
  }, [weightGoal, rangeEntries]);

  const { streak, weekDays } = useMemo(() => {
    const logged = new Set(meals.map(m => dateKey(m.loggedAt)));
    let count = 0;
    const d = new Date();
    if (!logged.has(dateKey(d))) d.setDate(d.getDate() - 1);
    while (logged.has(dateKey(d))) {
      count += 1;
      d.setDate(d.getDate() - 1);
    }
    const now = new Date();
    const sunday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    const days = WEEKDAY_LABELS.map((label, i) => {
      const day = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + i);
      return { label, logged: logged.has(dateKey(day)), isToday: dateKey(day) === dateKey(now) };
    });
    return { streak: count, weekDays: days };
  }, [meals]);

  const encouragement = (() => {
    if (streak >= 3 || (goalPct != null && goalPct > 0)) {
      return 'Great job! Consistency is key, and you’re mastering it!';
    }
    return 'Keep going! Every meal you log brings you closer to your goal.';
  })();

  const average = useMemo(() => {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const inRange = m => {
      const t = new Date(m.loggedAt);
      return t <= end && (!start || t >= start);
    };
    const current = meals.filter(inRange);
    const kcalOf = list => list.reduce((s, m) => s + (Number(m.kcal) || 0), 0);
    const daysOf = list => new Set(list.map(m => dateKey(m.loggedAt))).size;
    const curDays = daysOf(current);
    const avg = curDays ? Math.round(kcalOf(current) / curDays) : 0;
    let trend = null;
    if (start) {
      const spanMs = end - start;
      const prevStart = new Date(start.getTime() - spanMs);
      const prev = meals.filter(m => {
        const t = new Date(m.loggedAt);
        return t >= prevStart && t < start;
      });
      const prevDays = daysOf(prev);
      if (prevDays) {
        const prevAvg = kcalOf(prev) / prevDays;
        if (prevAvg > 0) trend = Math.round(((avg - prevAvg) / prevAvg) * 100);
      }
    }
    return { avg, curDays, trend };
  }, [meals, start]);

  return (
    <ScrollView
      className="flex-1 bg-white px-4 pt-12"
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <Text className="text-2xl font-bold text-ink mb-4">Progress</Text>

      {error && (
        <Card style={{ marginBottom: 12 }}>
          <Text className="text-danger text-sm mb-2">Could not load your activity. {error}</Text>
          <PrimaryButton title="Retry" onPress={handleRefresh} />
        </Card>
      )}

      {/* Your Weight */}
      <Card style={{ marginBottom: 12 }}>
        <View className="flex-row items-center">
          <View className="flex-1">
            <Text className="text-xs text-muted mb-1">Your Weight</Text>
            <View className="flex-row items-baseline">
              <Text className="text-3xl font-extrabold text-ink">{latest ? latest.value : '—'}</Text>
              {latest && <Text className="text-sm text-muted ml-1">lbs</Text>}
            </View>
            <Pressable onPress={onLogWeight} hitSlop={6} className="flex-row items-center mt-1">
              <Target size={12} color="#8A8A8A" />
              <Text className="text-xs text-muted ml-1">
                Goal: {weightGoal != null ? `${weightGoal} lbs` : 'not set'}
              </Text>
              <Pencil size={11} color="#8A8A8A" style={{ marginLeft: 4 }} />
            </Pressable>
            {onDeleteWeight && latest && (latest.id || latest._id) && !String(latest.id || latest._id).startsWith('temp-') && (
              <Pressable onPress={() => onDeleteWeight(latest.id || latest._id)} hitSlop={6} className="mt-1">
                <Text className="text-xs text-danger">Delete latest entry</Text>
              </Pressable>
            )}
          </View>
          <Pressable
            onPress={onLogWeight}
            accessibilityLabel="Log weight"
            className="bg-ink rounded-full px-4 py-2.5 flex-row items-center"
          >
            <Text className="text-white text-sm font-bold">Log Weight</Text>
            <ArrowRight size={14} color="#FFFFFF" style={{ marginLeft: 4 }} />
          </Pressable>
        </View>
      </Card>

      {/* Day streak */}
      <Card style={{ marginBottom: 12 }}>
        <View className="flex-row items-center mb-3">
          <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center">
            <Flame size={20} color="#FF6B35" fill="#FF6B35" />
          </View>
          <View className="ml-3 flex-row items-baseline">
            {loading ? (
              <ActivityIndicator color="#FF6B35" />
            ) : (
              <>
                <Text className="text-2xl font-extrabold text-ink">{streak}</Text>
                <Text className="text-sm text-muted ml-1.5">Day Streak</Text>
              </>
            )}
          </View>
        </View>
        <View className="flex-row justify-between px-1">
          {weekDays.map((d, i) => (
            <View key={i} className="items-center" style={{ width: 28 }}>
              <View
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor: d.logged ? '#FF6B35' : '#F1E8E0',
                  borderWidth: d.isToday && !d.logged ? 1.5 : 0,
                  borderColor: '#FF6B35',
                }}
              />
              <Text className={`text-[10px] mt-1.5 ${d.isToday ? 'text-ink font-bold' : 'text-muted'}`}>
                {d.label}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      {/* Weight progress chart */}
      <Card style={{ marginBottom: 12 }}>
        <View className="flex-row items-center justify-between mb-3">
          <Text className="font-bold text-ink">Weight Progress</Text>
          {goalPct != null && (
            <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: '#E7F8EE' }}>
              <Text className="text-xs font-bold" style={{ color: '#22C55E' }}>
                {goalPct}% of goal
              </Text>
            </View>
          )}
        </View>

        <View className="flex-row mb-3">
          {RANGES.map(r => (
            <View key={r.key} style={{ marginRight: 8 }}>
              <Chip label={r.key} active={range === r.key} onPress={() => setRange(r.key)} />
            </View>
          ))}
        </View>

        <View onLayout={e => setChartW(e.nativeEvent.layout.width)}>
          {rangeEntries.length >= 2 && chartW > 0 && (
            <WeightChart points={rangeEntries} width={chartW} height={210} />
          )}
        </View>
        {rangeEntries.length < 2 && (
          <View className="items-center justify-center py-10">
            <Scale size={22} color="#8A8A8A" />
            <Text className="text-muted text-sm mt-2 text-center">
              Log your weight at least twice{'\n'}to see your trend.
            </Text>
          </View>
        )}
      </Card>

      <Text className="text-center text-sm font-semibold mb-4" style={{ color: '#22C55E' }}>
        {encouragement}
      </Text>

      {/* Daily average calories */}
      <Card>
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center">
              <Flame size={20} color="#FF6B35" />
            </View>
            <Text className="text-sm text-muted ml-3">Daily Average{'\n'}Calories</Text>
          </View>
          <View className="items-end">
            {loading ? (
              <ActivityIndicator color="#FF6B35" />
            ) : average.curDays === 0 ? (
              <Text className="text-sm text-muted">No meals this period</Text>
            ) : (
              <View className="flex-row items-baseline">
                <Text className="text-2xl font-extrabold text-ink">{average.avg}</Text>
                <Text className="text-sm text-muted ml-1">kcal</Text>
                {average.trend != null && (
                  <View className="flex-row items-center ml-2">
                    {average.trend >= 0 ? (
                      <TrendingUp size={14} color="#22C55E" />
                    ) : (
                      <TrendingDown size={14} color="#EF4444" />
                    )}
                    <Text
                      className="text-xs font-bold ml-0.5"
                      style={{ color: average.trend >= 0 ? '#22C55E' : '#EF4444' }}
                    >
                      {Math.abs(average.trend)}%
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </Card>
    </ScrollView>
  );
}
