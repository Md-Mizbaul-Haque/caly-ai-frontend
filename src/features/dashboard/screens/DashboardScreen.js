import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, View, Text, RefreshControl } from "react-native";
import { router } from "expo-router";
import { Beef, Wheat, Droplet } from "../../../shared/components/ui/icons";
import Card from "../../../shared/components/ui/Card";
import ProgressRing from "../../../shared/components/ui/ProgressRing";
import MacroCard from "../../../shared/components/ui/MacroCard";
import EmptyState from "../../../shared/components/ui/EmptyState";
import DaySelector from "../../../shared/components/dashboard/DaySelector";
import MealRow from "../../../shared/components/dashboard/MealRow";
import { calcTotals } from "../../../shared/utils/totals";
import {
  calcAge,
  calcPlan,
  missingOnboardingFields,
  normalizeBirthDate,
} from "../../../shared/utils/nutrition";
import { formatAmount } from "../../../shared/utils/formatNumber";
import { groupMealsForDay } from "../../../shared/utils/groupMeals";
import { dateKey } from "../../../shared/utils/format";
import { zonedParts } from "../../../shared/utils/mealDates";
import { weekRange } from "../../../shared/lib/mealsApi";
import PrimaryButton from "../../../shared/components/ui/Button";
import { useTabShell } from "../../tabs/shell";

// Server-authoritative macro split (matches backend nutrition service):
// 2.0 g/kg protein for loss, 1.8 otherwise, 30% fat, remainder carbs.
// Falls back to the old 25/50/25 estimate only when the profile is
// incomplete (no weight/height/age/activity to compute a plan from).
function macroTargets(goal, user) {
  const g = Number(goal);
  const fallback = [
    {
      key: "protein",
      label: "Protein",
      target: Number.isFinite(g) && g > 0 ? Math.round((g * 0.25) / 4) : 0,
      color: "#f2470c",
      icon: Beef,
    },
    {
      key: "carbs",
      label: "Carbs",
      target: Number.isFinite(g) && g > 0 ? Math.round((g * 0.5) / 4) : 0,
      color: "#FACC15",
      icon: Wheat,
    },
    {
      key: "fat",
      label: "Fat",
      target: Number.isFinite(g) && g > 0 ? Math.round((g * 0.25) / 9) : 0,
      color: "#22C55E",
      icon: Droplet,
    },
  ];
  try {
    if (!user || missingOnboardingFields(user).length > 0) return fallback;
    const birthDate = normalizeBirthDate(user.birthDate);
    const age = calcAge(birthDate);
    if (!Number.isFinite(age)) return fallback;
    const plan = calcPlan({
      gender: user.gender,
      weightKg: user.weightKg,
      heightCm: user.heightCm,
      age,
      activityLevel: user.activityLevel,
      targetWeightKg: user.targetWeightKg,
    });
    if (
      ![plan.proteinG, plan.fatG, plan.carbsG].every(
        (v) => Number.isFinite(v) && v >= 0,
      )
    )
      return fallback;
    return [
      {
        key: "protein",
        label: "Protein",
        target: plan.proteinG,
        color: "#f2470c",
        icon: Beef,
      },
      {
        key: "carbs",
        label: "Carbs",
        target: plan.carbsG,
        color: "#FACC15",
        icon: Wheat,
      },
      {
        key: "fat",
        label: "Fat",
        target: plan.fatG,
        color: "#22C55E",
        icon: Droplet,
      },
    ];
  } catch {
    return fallback;
  }
}

// Whole-screen placeholder while the first week loads (loading && no meals).
// Mirrors the real layout (week strip, calorie card, macros, meal rows) so
// content doesn't jump when data lands. Plain Views + animate-pulse only.
function DashboardSkeleton() {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Loading your week"
    >
      <View className="flex-row mt-4" style={{ gap: 6 }}>
        {Array.from({ length: 7 }).map((_, i) => (
          <View
            key={i}
            className="flex-1 h-[72px] rounded-card bg-[#F1E8E0] animate-pulse"
          />
        ))}
      </View>
      <Card style={{ marginTop: 16 }}>
        <View className="flex-row items-center">
          <View className="flex-1 pr-2">
            <View className="w-32 h-10 rounded-md bg-[#F1E8E0] animate-pulse" />
            <View className="w-24 h-3 rounded-md bg-[#F1E8E0] animate-pulse mt-2" />
          </View>
          <View className="w-[92px] h-[92px] rounded-full bg-[#F1E8E0] animate-pulse" />
        </View>
      </Card>
      <View className="flex-row mt-4" style={{ gap: 8 }}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            className="flex-1 h-[92px] rounded-card bg-[#F1E8E0] animate-pulse"
          />
        ))}
      </View>
      <View className="w-32 h-4 rounded-md bg-[#F1E8E0] animate-pulse mt-6 mb-3" />
      <View style={{ gap: 12 }}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            className="h-16 rounded-card bg-[#F1E8E0] animate-pulse"
          />
        ))}
      </View>
    </View>
  );
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
  // Bumped after every pull-to-refresh so the day strip re-centers on the
  // (possibly resized) selected pill.
  const [recenterSignal, setRecenterSignal] = useState(0);
  // Pull-to-refresh owns its own flag: the shared `loading` covers first
  // load / hydration (incl. ~30 s offline revalidation), so binding
  // RefreshControl to it pins the native Android spinner over Home.
  const [refreshing, setRefreshing] = useState(false);
  const s = useTabShell();
  const { selectedDate } = s;
  // Use setSelectedDate from context directly - the context provider ensures
  // it's the same function reference, preventing re-render loops

  // Props win; context (TabShell) is the fallback so the screen works both
  // under the tab layout and in isolation. Previously this read only
  // s.progressCache, which the provider never supplied -> always empty.
  // Destructure context values first so memo/effect deps below are stable
  // primitives (not `s.foo?.bar` member expressions, which lint can't track
  // and which re-evaluate against a new `s` identity every provider render).
  const progressMeals = s.progressCache?.meals;
  const contextMeals = s.meals;
  const contextRangeMeals = s.rangeMeals;
  const { loadWeek, loadRangeMeals, setSelectedDate } = s;
  const timeZone = timeZoneProp ?? s.timeZone;
  const meals = useMemo(
    () => mealsProp ?? progressMeals ?? contextMeals ?? [],
    [mealsProp, progressMeals, contextMeals],
  );
  const goal = goalProp ?? s.goal ?? null;
  const user = s.user ?? null;
  // Stable identity: a fresh `?? []` every render would defeat the
  // totalsByDate memo below.
  const rangeMeals = useMemo(() => contextRangeMeals ?? [], [contextRangeMeals]);
  const ownerKey = user ? user._id || user.id || user.email : null;
  // Props win; context (TabShell) is the fallback so the screen works both
  // under the tab layout and in isolation.
  const loading = loadingProp ?? s.loading ?? false;
  const error = errorProp ?? s.error ?? null;
  const weightGoal =
    weightGoalProp ?? s.progressCache?.weightGoal ?? s.weightGoal ?? null;
  void weightGoal;

  // The strip shows ±10 days but `meals` covers only the selected week, so
  // past pills would paint empty rings. Prefetch the trailing 14 days once
  // per owner+zone+calendar-day (silent, horizon-guarded inside loadRangeMeals
  // — no spinner). Composite key: Fast Refresh resets this ref to null while
  // the provider keeps its state, so the key must fully describe the data
  // (owner, zone, today, horizon) — otherwise the post-refresh run refetches
  // unconditionally and, combined with an unstable `loadRangeMeals` identity,
  // re-triggers on every provider render (spinner loop).
  const loadedRangeRef = useRef(null);

  useEffect(() => {
    if (!ownerKey) return;

    const tz = timeZone ?? "";
    const todayKey = dateKey(new Date(), timeZone);
    if (!todayKey) return;
    const cacheKey = `${ownerKey}|${tz}|${todayKey}|14d`;
    if (loadedRangeRef.current === cacheKey) return;
    loadedRangeRef.current = cacheKey;

    loadRangeMeals?.(14)?.catch?.((err) =>
      console.error("Range meals fetch failed:", err),
    );
  }, [ownerKey, timeZone, loadRangeMeals]);

  // Day blocks rebuild Date objects every render: compare calendar keys so
  // re-tapping the selected pill is a no-op instead of churning the dashboard.
  // Deps use the stable state setter (not the whole shell object) so the
  // DaySelector's onSelect keeps its identity across data updates instead of
  // re-rendering the 60+ ring strip on every meal/weight change.
  const handleSelect = useCallback(
    (d) => {
      // Use the setSelectedDate from context - it's stabilized by the provider
      setSelectedDate?.((prev) =>
        dateKey(prev, timeZone) === dateKey(d, timeZone) ? prev : d,
      );
    },
    [timeZone, setSelectedDate],
  );

  // Load the calendar week containing the selected day. Without this, days
  // outside the initially fetched current week could never show data.
  // Composite guard (owner + week start + zone): same-week re-taps, parent
  // re-renders, and Fast Refresh ref-runs all hit the guard instead of
  // refetching. Owner is load-bearing: without it an account switch to the
  // same calendar week reuses the previous owner's ref and never fetches.
  const loadedWeekRef = useRef(null);

  useEffect(() => {
    if (!selectedDate || !ownerKey) return;

    const { from } = weekRange(selectedDate, timeZone);
    if (!from) return;
    const weekId = `${ownerKey}|${from}|${timeZone ?? ""}`;

    // Strict guard: if we already fetched this exact week, do NOT run it again
    if (loadedWeekRef.current === weekId) return;
    loadedWeekRef.current = weekId;

    loadWeek?.({ reference: selectedDate, silent: true })?.catch?.((err) => {
      console.error("Week fetch failed:", err);
      // Reset ref on failure so the user can retry
      loadedWeekRef.current = null;
    });
  }, [selectedDate, timeZone, ownerKey, loadWeek]);

  const MACROS = useMemo(() => macroTargets(goal, user), [goal, user]);

  const dayMeals = useMemo(() => {
    // When not focused, we still want to calculate dayMeals for cache consistency
    // but we won't render it until focused. This prevents flicker when navigating back.
    return meals.filter(
      (m) => dateKey(m.loggedAt, timeZone) === dateKey(selectedDate, timeZone),
    );
  }, [meals, selectedDate, timeZone]);

  // Repeat logs of the same meal collapse into one summed card (display-only;
  // totals still sum the raw entries so the ring never drifts from the list).
  const groupedDayMeals = useMemo(() => groupMealsForDay(dayMeals), [dayMeals]);

  const t = useMemo(() => {
    // Calculate totals regardless of focus state to maintain consistency
    // The UI layer can choose to show/hide based on focus if needed
    return calcTotals(dayMeals, goal);
  }, [dayMeals, goal]);

  const totalsByDate = useMemo(() => {
    // Rings need past days too: week rows win over the horizon fetch (same
    // idiom as ProgressScreen) so overlaps never double-count.
    const byId = new Map();
    for (const m of rangeMeals) byId.set(m.id || m._id, m);
    for (const m of meals) byId.set(m.id || m._id, m);
    const accum = {};
    for (const m of byId.values()) {
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
        remaining: goal == null ? null : Math.max(0, goal - totals.eaten),
      };
    }
    return out;
  }, [meals, rangeMeals, goal, timeZone]);

  // Swiping/tapping selects other days: the list title follows the selection.
  const WEEKDAY_NAMES = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const isTodaySelected =
    dateKey(selectedDate, timeZone) === dateKey(new Date(), timeZone);
  const mealsTitle = isTodaySelected
    ? "Today's Meals"
    : `${WEEKDAY_NAMES[zonedParts(selectedDate, timeZone).weekday] ?? "Selected day"}'s Meals`;

  async function handleRefresh() {
    setRefreshing(true);
    try {
      if (onRetry) await onRetry();
      else await s.loadWeek?.({ reference: selectedDate }); // Refresh meals data
      await s.refreshWeights?.(); // Refresh weights and goal
    } catch (err) {
      console.error("Refresh failed:", err);
    } finally {
      setRefreshing(false);
      setRecenterSignal((n) => n + 1);
    }
  }

  // First load (no cached meals yet): paint skeletons, not a spinner, so
  // the layout doesn't jump when data lands. Refreshes keep visible data.
  const showSkeleton = loading && meals.length === 0;

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 96,
      }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View style={{ width: "100%", maxWidth: 480, alignSelf: "center" }}>
        <View className="flex-row items-center">
          <Text className="text-lg font-bold text-ink">Caly AI</Text>
          <View className="flex-1" />
        </View>

        {showSkeleton && <DashboardSkeleton />}
        {!showSkeleton && (
          <>
            {error && meals.length === 0 && !loading && (
              <Card style={{ marginTop: 4 }}>
                <Text className="font-bold text-ink mb-1">
                  {"Couldn't load meals"}
                </Text>
                <Text className="text-sm text-muted-foreground mb-3">
                  {error}
                </Text>
                <PrimaryButton title="Retry" onPress={onRetry} />
              </Card>
            )}

            <View className="mt-4">
              <DaySelector
                selected={selectedDate}
                onSelect={handleSelect}
                totalsByDate={totalsByDate}
                goal={goal}
                timeZone={timeZone}
                recenterSignal={recenterSignal}
              />
            </View>

            {goal == null && !loading && (
              <Card style={{ marginTop: 16 }}>
                <Text className="font-bold text-ink mb-1">
                  Set your calorie goal
                </Text>
                <Text className="text-sm text-muted-foreground mb-3">
                  Tell us your target so rings and totals mean something.
                </Text>
                <PrimaryButton
                  title="Set goal"
                  onPress={() => router.push("/calorie-macro-targets")}
                />
              </Card>
            )}

            <Card style={{ marginTop: 16 }}>
              <View className="flex-row items-center">
                <View className="flex-1 pr-2">
                  <View
                    className="flex-row items-baseline"
                    style={{ minWidth: 0 }}
                  >
                    <Text
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.6}
                      style={{ flexShrink: 1, minWidth: 0 }}
                      className="text-5xl font-extrabold text-ink"
                    >
                      {formatAmount(t.eaten, 0)}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={{ flexShrink: 0 }}
                      className="text-lg font-semibold text-muted-foreground"
                    >
                      /{goal == null ? "—" : formatAmount(goal, 0)}
                    </Text>
                  </View>
                  <Text className="text-sm text-muted-foreground mt-1">
                    Calories eaten
                  </Text>
                </View>
                <ProgressRing
                  eaten={t.eaten}
                  goal={goal ?? 1}
                  size={92}
                  strokeWidth={10}
                >
                  <Text className="text-2xl">🔥</Text>
                </ProgressRing>
              </View>
            </Card>

            <View className="flex-row mt-4" style={{ gap: 8 }}>
              {MACROS.map((m) => (
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

            <Text className="text-base font-bold text-ink mt-6 mb-3">
              {mealsTitle}
            </Text>
            {groupedDayMeals.length === 0 ? (
              <Card>
                <EmptyState onCta={onAdd} />
              </Card>
            ) : (
              <View style={{ gap: 12 }}>
                {groupedDayMeals.map((m) => (
                  <MealRow key={m.id} meal={m} onDelete={onDelete} />
                ))}
              </View>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}
