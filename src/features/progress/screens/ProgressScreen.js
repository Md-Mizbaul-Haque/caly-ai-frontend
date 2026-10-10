import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View, RefreshControl } from 'react-native';
import { useIsFocused } from 'expo-router/react-navigation';
import Card from '../../../shared/components/ui/Card';
import Chip from '../../../shared/components/ui/Chip';
import WeightChart from '../../../shared/components/WeightChart';
import { ArrowRight, Flame, Pencil, Scale, Target, TrendingDown, TrendingUp } from '../../../shared/components/ui/icons';
import { dateKey } from '../../../shared/utils/format';

const RANGES = [
  { key: '90D', days: 90, label: 'last 90 days' },
  { key: '6M', months: 6, label: 'last 6 months' },
  { key: '1Y', months: 12, label: 'last year' },
  { key: 'ALL', label: 'all time' },
];

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// Weights are entered to 1 decimal; 132.44999… → "132.4", 132 → "132".
const fmt = v => (Math.round(Number(v) * 10) / 10).toString();

function rangeStart(rangeKey) {
  const now = new Date();
  const r = RANGES.find(x => x.key === rangeKey);
  if (!r || (!r.days && !r.months)) return null;
  return r.days
    ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - r.days)
    : new Date(now.getFullYear(), now.getMonth() - r.months, now.getDate());
}

/**
 * Progress tab. All data comes from the tab shell via props (live state, so
 * optimistic updates like logging a weight are visible immediately) and is
 * revalidated against /api/weights + /api/meals whenever the tab focuses.
 */
export default function ProgressScreen({
  bottomOffset = 0,
  weights = [],
  weightGoal = null,
  meals = [], // current calendar week (freshest, includes optimistic rows)
  rangeMeals = [], // ~1 year of meals fetched for this screen
  loading = false,
  error = null,
  timeZone,
  onLogWeight,
  onEditGoal,
  onRetry,
  onRefreshWeights,
  onLoadRangeMeals,
  onDeleteWeight,
}) {
  const [range, setRange] = useState('6M');
  const [refreshing, setRefreshing] = useState(false);
  const isFocused = useIsFocused();

  // Revalidate on every focus: weights/goal + the year of meals this screen
  // needs for streak and daily-average. Fire-and-forget — cached data paints
  // meanwhile, failures just leave the cache as-is.
  useEffect(() => {
    if (!isFocused) return;
    onRefreshWeights?.();
    onLoadRangeMeals?.(365)?.catch?.(() => {});
  }, [isFocused, onRefreshWeights, onLoadRangeMeals]);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      // allSettled: one failing request must not swallow the others.
      await Promise.allSettled([
        onRetry?.(),
        onRefreshWeights?.(),
        onLoadRangeMeals?.(365),
      ]);
    } finally {
      setRefreshing(false);
    }
  }

  // Week rows win over the year fetch (they carry fresher optimistic state).
  const mergedMeals = useMemo(() => {
    const byId = new Map();
    for (const m of rangeMeals) byId.set(m.id || m._id, m);
    for (const m of meals) byId.set(m.id || m._id, m);
    return [...byId.values()];
  }, [meals, rangeMeals]);

  const entries = useMemo(
    () => weights
      .map(w => ({ id: w.id || w._id, date: new Date(w.loggedAt), value: Number(w.value) }))
      .filter(w => !Number.isNaN(w.date.getTime()) && Number.isFinite(w.value))
      .sort((a, b) => a.date - b.date),
    [weights]
  );

  const latest = entries.length ? entries[entries.length - 1] : null;

  // Goal direction: +1 gaining toward it, -1 losing toward it, 0 when
  // maintaining or unset (trend stays neutral instead of misleading).
  const goalDir = weightGoal != null && latest && Number.isFinite(Number(weightGoal)) && latest.value !== Number(weightGoal)
    ? Math.sign(Number(weightGoal) - latest.value)
    : 0;

  const start = useMemo(() => rangeStart(range), [range]);
  const rangeMeta = RANGES.find(r => r.key === range);
  const rangeEntries = useMemo(
    () => (start ? entries.filter(e => e.date >= start) : entries),
    [entries, start]
  );
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
    const logged = new Set(mergedMeals.map(m => dateKey(m.loggedAt, timeZone)).filter(Boolean));
    // Step back whole calendar days in the user's zone (noon-anchored UTC
    // so DST transitions can't skip or double a day).
    const shiftKey = (key, delta) => {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key || '');
      if (!m) return '';
      return dateKey(new Date(Date.UTC(+m[1], +m[2] - 1, +m[3] + delta, 12)), timeZone);
    };
    let count = 0;
    let cursor = dateKey(new Date(), timeZone);
    if (!logged.has(cursor)) cursor = shiftKey(cursor, -1);
    while (cursor && logged.has(cursor)) {
      count += 1;
      cursor = shiftKey(cursor, -1);
    }
    const now = new Date();
    const sunday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    const days = WEEKDAY_LABELS.map((label, i) => {
      const day = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + i);
      return { label, logged: logged.has(dateKey(day, timeZone)), isToday: dateKey(day, timeZone) === dateKey(now, timeZone) };
    });
    return { streak: count, weekDays: days };
  }, [mergedMeals, timeZone]);

  const encouragement = (() => {
    if (entries.length === 0) return null;
    if (streak >= 3 || (goalPct != null && goalPct > 0)) {
      return 'Keep it up! You\'re on a roll 🔥';
    }
    if (streak >= 3) {
      return 'Steady progress — every log counts!';
    }
    return 'Every log moves you forward';
  })();

  const average = useMemo(() => {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const inRange = m => {
      const t = new Date(m.loggedAt);
      return !Number.isNaN(t.getTime()) && t <= end && (!start || t >= start);
    };
    const current = mergedMeals.filter(inRange);
    const kcalOf = list => list.reduce((sum, m) => sum + (Number(m.kcal) || 0), 0);
    const daysOf = list => new Set(list.map(m => dateKey(m.loggedAt, timeZone)).filter(Boolean)).size;
    const curDays = daysOf(current);
    const avg = curDays ? Math.round(kcalOf(current) / curDays) : 0;
    let trend = null;
    if (start) {
      // Compare against the equally long window just before this range.
      const spanMs = end - start;
      const prevStart = new Date(start.getTime() - spanMs);
      const prev = mergedMeals.filter(m => {
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
  }, [mergedMeals, start, timeZone]);

  // Intake moving WITH the goal direction reads good, against it reads bad;
  // maintain/unset stays neutral instead of misleading.
  const trendAligned = average.trend == null || goalDir === 0
    ? null
    : (average.trend >= 0) === (goalDir > 0);
  const trendTone = trendAligned == null ? '#8A8A8A' : trendAligned ? '#22C55E' : '#E64D4D';

  const emptyAll = !loading && !entries.length && !mergedMeals.length;

  return (
    <ScrollView
      className="flex-1 bg-white px-4 pt-12"
      // Clearance above the tab bar: the measured tab height plus breathing
      // room, so the last card is never flush against (or hidden behind) it.
      contentContainerStyle={{ paddingBottom: 32 + (bottomOffset || 0) }}
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <Text className="text-2xl font-bold text-ink mb-4">Progress</Text>

      {loading && !entries.length && !mergedMeals.length && (
        <Card style={{ marginBottom: 12 }}>
          <View className="items-center py-4">
            <ActivityIndicator color="#f2470c" />
            <Text className="text-xs text-muted-foreground mt-2">Loading your progress…</Text>
          </View>
        </Card>
      )}

      {error && emptyAll && (
        <Card style={{ marginBottom: 12 }}>
          <Text className="text-sm text-destructive mb-2">Couldn’t load your progress. {error}</Text>
          {onRetry && (
            <Pressable
              onPress={onRetry}
              accessibilityLabel="Retry loading"
              className="self-start bg-ink rounded-full px-4 py-2"
            >
              <Text className="text-white text-xs font-bold">Retry</Text>
            </Pressable>
          )}
        </Card>
      )}

      {/* Your Weight */}
      <Card style={{ marginBottom: 12 }}>
        <View className="flex-row items-center">
          <View className="flex-1">
            <Text className="text-xs text-muted-foreground mb-1">Your Weight</Text>
            <View className="flex-row items-baseline">
              <Text className="text-3xl font-extrabold text-ink">{latest ? fmt(latest.value) : '—'}</Text>
              {latest && <Text className="text-sm text-muted-foreground ml-1">lbs</Text>}
            </View>
            <View className="flex-row items-center mt-1">
              <Pressable onPress={onLogWeight} hitSlop={6} className="flex-row items-center">
                <Target size={12} color="#8A8A8A" />
                <Text className="text-xs text-muted-foreground ml-1">
                  Goal: {weightGoal != null ? `${fmt(weightGoal)} lbs` : 'not set'}
                </Text>
              </Pressable>
              <Pressable onPress={() => onEditGoal?.()} hitSlop={8} accessibilityLabel="Edit weight goal" accessibilityRole="button" className="p-1" style={{ marginLeft: 4 }}>
                <Pencil size={11} color="#8A8A8A" />
              </Pressable>
            </View>
            </View>
          <Pressable
            onPress={onLogWeight}
            accessibilityLabel="Log weight"
            accessibilityRole="button"
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
            <Flame size={20} color="#f2470c" fill="#f2470c" />
          </View>
          <View className="ml-3 flex-row items-baseline">
            <Text className="text-2xl font-extrabold text-ink">{streak}</Text>
            <Text className="text-sm text-muted-foreground ml-1.5">Day Streak</Text>
          </View>
        </View>
        <View className="flex-row justify-between px-1">
          {weekDays.map((d, i) => (
            <View key={i} className="items-center" style={{ width: 28 }}>
              <View
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor: d.logged ? '#f2470c' : '#F1E8E0',
                  borderWidth: d.isToday && !d.logged ? 1.5 : 0,
                  borderColor: '#f2470c',
                }}
              />
              <Text className={`text-[10px] mt-1.5 ${d.isToday ? 'text-ink font-bold' : 'text-muted-foreground'}`}>
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
            <View className="rounded-full px-2.5 py-1 bg-success/10">
              <Text className="text-xs font-bold text-success">
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
            // Remount on range/count change so the highlight follows the data
            // (latest entry) instead of going stale; taps still work within
            // a stable dataset.
            <WeightChart key={`${range}-${rangeEntries.length}`} points={rangeEntries} width={chartW} height={210} />
          )}
        </View>
        {rangeEntries.length < 2 && (
          <View className="items-center justify-center py-10">
            <Scale size={22} color="#8A8A8A" />
            <Text className="text-muted-foreground text-sm mt-2 text-center">
              {entries.length === 0
                ? 'Tap "Log Weight" to get started'
                : entries.length === 1
                  ? 'One log so far — keep going\nso your trend can appear.'
                  : 'Log your weight at least twice\nto see your trend.'}
            </Text>
          </View>
        )}
      </Card>

      <Text className="text-center text-sm font-semibold mb-4 text-success">
        {encouragement}
      </Text>

      {/* Daily average calories for the selected range */}
      <Card>
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center">
              <Flame size={20} color="#f2470c" />
            </View>
            <View className="ml-3">
              <Text className="text-sm text-muted-foreground">Daily Average{'\n'}Calories</Text>
              <Text className="text-[10px] text-muted-foreground mt-0.5">{rangeMeta.label}</Text>
            </View>
          </View>
          <View className="items-end">
            {average.curDays === 0 ? (
              <>
                <Text className="text-sm text-muted-foreground">No meals logged</Text>
                <Text className="text-[10px] text-muted-foreground mt-0.5">{rangeMeta.label}</Text>
              </>
            ) : (
              <View className="items-end">
                <View className="flex-row items-baseline">
                  <Text className="text-2xl font-extrabold text-ink">{average.avg}</Text>
                  <Text className="text-sm text-muted-foreground ml-1">kcal</Text>
                  {average.trend != null && (
                    <View className="flex-row items-center ml-2">
                      {average.trend >= 0 ? (
                        <TrendingUp size={14} color={trendTone} />
                      ) : (
                        <TrendingDown size={14} color={trendTone} />
                      )}
                      <Text
                        className={`text-xs font-bold ml-0.5 ${trendAligned == null ? 'text-muted-foreground' : trendAligned ? 'text-success' : 'text-destructive'}`}
                      >
                        {Math.abs(average.trend)}%
                      </Text>
                    </View>
                  )}
                </View>
                <Text className="text-[10px] text-muted-foreground mt-0.5">
                  over {average.curDays} logged {average.curDays === 1 ? 'day' : 'days'}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Card>
    </ScrollView>
  );
}
