import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Card from '../shared/components/ui/Card';
import PrimaryButton from '../shared/components/ui/Button';
import ScreenHeader from '../shared/components/ui/ScreenHeader';
import { Scale } from '../shared/components/ui/icons';
import { toastSuccess, toastError } from '../shared/utils/toast';
import { fetchWeightGoal, setWeightGoal } from '../shared/lib/weightsApi';
import { readCache, writeCache, scopedKey } from '../shared/lib/appCache';
import { useSession } from '../features/auth/session';
import { MIN_LBS, MAX_LBS, sanitizeDecimalInput, parseWeight, isValidWeight, shouldSendGoal } from '../shared/utils/weightLog';

const PACES = [
  { id: 'slow', label: 'Slow', desc: '~0.25 kg/week · gentle' },
  { id: 'steady', label: 'Steady', desc: '~0.5 kg/week · recommended' },
  { id: 'fast', label: 'Fast', desc: '~0.75 kg/week · aggressive' },
];
const ACTIVITIES = [
  { id: 'sedentary', label: 'Sedentary', desc: 'Little or no exercise' },
  { id: 'light', label: 'Light', desc: '1–3 days / week' },
  { id: 'moderate', label: 'Moderate', desc: '3–5 days / week' },
  { id: 'high', label: 'High', desc: 'Daily / intense' },
];
const PACE_RATE_LBS = { slow: 0.55, steady: 1.1, fast: 1.65 };
// Server missing[] names raw profile fields — the wizard translates them so
// the user knows exactly what still blocks their calorie plan.
const FIELD_LABEL = {
  gender: 'Gender',
  birthDate: 'Birth date',
  heightCm: 'Height',
  weightKg: 'Current weight',
  targetWeightKg: 'Target weight',
  activityLevel: 'Activity level',
};

function OptionRow({ selected, label, desc, onPress, testID }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      testID={testID}
      className={`flex-row items-center px-3 py-2.5 rounded-xl mb-2 border ${selected ? 'border-[#f2470c] bg-accent' : 'border-border bg-input'}`}
    >
      <View className={`w-5 h-5 rounded-full border-2 mr-3 items-center justify-center ${selected ? 'border-[#f2470c]' : 'border-muted-foreground'}`}>
        {selected ? <View className="w-2.5 h-2.5 rounded-full bg-[#f2470c]" /> : null}
      </View>
      <View className="flex-1">
        <Text className="font-semibold text-ink">{label}</Text>
        <Text className="text-[12px] text-muted-foreground">{desc}</Text>
      </View>
    </Pressable>
  );
}

export default function WeightTrackerScreen() {
  const router = useRouter();
  const { goal: dailyKcal, setGoal: setDailyKcal, user, refreshUser } = useSession();
  const [goal, setGoal] = useState(null);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  // Profile fields the server says still block the calorie plan (plan:null +
  // missing[]). Shown in the wizard with a path to complete them.
  const [missing, setMissing] = useState(null);
  // True when the server answered without a plan AND without missing[] (stale
  // backend or hiccup) — the kcal on screen is untouched and must say so.
  const [planError, setPlanError] = useState(false);
  // Mirrors the planAttention flag Home reads: goal saved, kcal not updated.
  const [attention, setAttention] = useState(false);
  // Wizard state — mini onboarding: target + pace + activityLevel.
  const [draft, setDraft] = useState('');
  const [pace, setPace] = useState('steady');
  const [activityLevel, setActivityLevel] = useState('moderate');
  // True when the network failed but cached data is on screen — the numbers
  // are saved data, not fresh, and the UI must say so.
  const [stale, setStale] = useState(false);

  const userKey = user?._id || user?.id || user?.email || null;
  // Last server goal the draft was synced from. Fresh data adopts it; user
  // typing (draft !== synced) is never overwritten by a refetch.
  const lastSyncedRef = useRef(null);
  // Ref mirror of the session refresher: its identity changes every provider
  // render, which would re-fire the focus effect below on every render.
  const refreshUserRef = useRef(refreshUser);
  useEffect(() => { refreshUserRef.current = refreshUser; });

  // Network revalidation against the database. Cache paint happens only on
  // mount (first call); focus visits only refresh. Returns a stopper.
  const syncNetworkGoal = useCallback(() => {
    let alive = true;
    fetchWeightGoal()
      .then((g) => {
        if (!alive) return;
        if (g != null) {
          setGoal(g);
          setDraft((d) => (d === '' || d === String(lastSyncedRef.current) ? String(g) : d));
          lastSyncedRef.current = g;
          writeCache(scopedKey('weightGoal', userKey), g);
        }
        setStale(false);
        setError(null);
      })
      .catch((e) => {
        if (!alive) return;
        // Something is already painted (cache or an earlier fetch): label it
        // stale instead of erroring. Nothing painted: surface the error.
        if (lastSyncedRef.current != null) setStale(true);
        else setError(e.message || 'Could not load your goal.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => { alive = false; };
  }, [userKey]);

  useEffect(() => {
    let alive = true;
    // Instant paint: per-user cached goal renders immediately, network revalidates.
    readCache(scopedKey('weightGoal', userKey)).then((cached) => {
      if (!alive) return;
      if (cached != null) {
        setGoal(cached);
        setDraft(String(cached));
        lastSyncedRef.current = cached;
        setLoading(false);
      }
    }).catch(() => {});
    readCache(scopedKey('planAttention', userKey)).then((v) => {
      if (alive) setAttention(v === true);
    }).catch(() => {});
    const stop = syncNetworkGoal();
    return () => { alive = false; stop?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userKey]);

  // Returning to this screen re-reads the database (goal + session kcal and
  // current weight) so yesterday's cache never poses as fresh data.
  useFocusEffect(
    useCallback(() => {
      const stop = syncNetworkGoal();
      refreshUserRef.current?.().catch(() => {});
      return () => { stop?.(); };
    }, [syncNetworkGoal])
  );

  const parsed = parseWeight(draft);
  const valid = isValidWeight(parsed);
  const canSave = !busy && valid;
  const currentLbs = user?.weightKg != null ? Math.round(user.weightKg * 2.20462 * 10) / 10 : null;
  const etaWeeks = parsed != null && currentLbs != null
    ? Math.max(0, Math.ceil(Math.abs(parsed - currentLbs) / (PACE_RATE_LBS[pace] ?? 1.1)))
    : null;

  async function handleSave() {
    if (!canSave) return;
    setBusy(true);
    setError(null);
    try {
      const res = await setWeightGoal(parsed, { pace, activityLevel });
      const saved = res?.goal ?? res;
      setGoal(saved);
      setDraft(String(saved));
      lastSyncedRef.current = saved;
      setStale(false);
      writeCache(scopedKey('weightGoal', userKey), saved);
      const nextPlan = res?.plan ?? null;
      if (nextPlan) {
        setPlan(nextPlan);
        setMissing(null);
        setPlanError(false);
        setAttention(false);
        // A computed plan clears the incomplete-plan flag Home watches.
        writeCache(scopedKey('planAttention', userKey), null);
        if (Number.isFinite(Number(nextPlan.dailyGoalKcal))) setDailyKcal(Number(nextPlan.dailyGoalKcal));
        toastSuccess('Goal updated', `${saved} lbs · ${nextPlan.dailyGoalKcal} kcal per day`);
        setWizardOpen(false);
      } else if (res?.missing?.length) {
        // Goal saved but the database kcal is untouched (plan:null) — flag it
        // so Home explains the unchanged target instead of looking wrong, and
        // keep the wizard open on the checklist (closing it would strand the
        // user on a stale number with no path forward).
        setMissing(res.missing);
        setPlanError(false);
        setAttention(true);
        writeCache(scopedKey('planAttention', userKey), true);
        toastSuccess('Goal saved', `${saved} lbs target — complete your profile for a calorie plan`);
      } else {
        // No plan and no missing[]: stale backend or server hiccup. Never
        // claim the calorie plan updated — offer a retry instead.
        setMissing(null);
        setPlanError(true);
        setAttention(true);
        writeCache(scopedKey('planAttention', userKey), true);
        toastError('Calorie plan did not update', 'Your goal saved — retry to recompute Daily Targets.');
      }
      try { await refreshUser(); } catch { /* best-effort sync */ }
    } catch (e) {
      setError(e.message || 'Could not save goal. Try again.');
      toastError('Could not save goal', e.message);
    } finally {
      setBusy(false);
    }
  }

  const showLoading = loading && goal == null;

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Weight Tracker" subtitle="Set your weight goal" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ width: '100%', maxWidth: 480, alignSelf: 'center' }}>
          {showLoading ? (
            <Card>
              <View className="items-center py-4">
                <ActivityIndicator color="#f2470c" />
                <Text className="text-xs text-muted-foreground mt-2">Loading your goal…</Text>
              </View>
            </Card>
          ) : (
            <>
              <Card>
                <View className="flex-row items-center mb-1">
                  <View className="w-9 h-9 rounded-full items-center justify-center mr-3 bg-muted">
                    <Scale size={18} color="#f2470c" />
                  </View>
                  <View className="flex-1">
                    <Text className="font-bold text-ink">Your weight goal</Text>
                    <Text className="text-[13px] text-muted-foreground">
                      {goal != null ? `Currently ${goal} lbs` : 'No goal set yet'}
                    </Text>
                  </View>
                </View>
                <View className="bg-muted rounded-xl px-3 py-2.5 mt-3">
                  <Text className="text-[13px] text-muted-foreground">Daily calorie target</Text>
                  <Text className="text-[20px] font-extrabold text-ink">
                    {plan?.dailyGoalKcal ?? dailyKcal ?? '—'}{plan?.dailyGoalKcal || dailyKcal ? ' kcal per day' : ''}
                  </Text>
                          {plan?.etaWeeks != null ? (
                            <Text className="text-[12px] text-muted-foreground mt-0.5">About {plan.etaWeeks} weeks at {plan.pace} pace</Text>
                          ) : null}
                        </View>
                        {error ? <Text className="text-destructive text-[13px] mt-2">{error}</Text> : null}
                        {attention && !error ? (
                          <Text className="text-[12px] text-muted-foreground mt-2">
                            Goal saved, but Daily Targets need a complete profile — tap Update goal to review.
                          </Text>
                        ) : null}
                        {stale && !error ? (
                          <Text className="text-[12px] text-muted-foreground mt-2">
                            Couldn’t refresh — showing saved data.
                          </Text>
                        ) : null}
                <View className="mt-3">
                  <PrimaryButton
                    title="Update goal — start setup"
                    onPress={() => {
                      if (goal != null && draft === '') setDraft(String(goal));
                      if (user?.activityLevel) setActivityLevel(user.activityLevel);
                      if (user?.goalPace) setPace(user.goalPace);
                      setWizardOpen(true);
                    }}
                  />
                </View>
                <Text className="text-[12px] text-muted-foreground mt-2">
                  Set up goal again: target weight, pace and activity — your Daily Targets update automatically.
                </Text>
              </Card>

              <Text className="text-[13px] text-muted-foreground mt-5 px-1">
                Log a weigh-in from Progress or the + button — same-day re-logs replace the previous entry.
              </Text>
            </>
          )}
        </View>
      </ScrollView>

      <Modal visible={wizardOpen} animationType="slide" onRequestClose={() => { if (!busy) setWizardOpen(false); }}>
        <View className="flex-1 bg-background">
          <ScreenHeader title="Set up your goal" subtitle="Target, pace and activity" />
          <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
            <View style={{ width: '100%', maxWidth: 480, alignSelf: 'center' }}>
              <Card>
                <Text className="font-bold text-ink mb-1">Target weight (lbs)</Text>
                <TextInput
                  value={draft}
                  onChangeText={(v) => setDraft(sanitizeDecimalInput(v))}
                  keyboardType="decimal-pad"
                  placeholder="e.g. 140"
                  accessibilityLabel="Weight goal in pounds"
                  className="bg-input rounded-xl px-3 py-2.5 text-ink mb-2 mt-2 border border-border"
                />
                {draft.trim() !== '' && !valid ? (
                  <Text className="text-destructive text-[13px] mb-2">Enter a goal between {MIN_LBS}–{MAX_LBS} lbs</Text>
                ) : null}
                {valid && goal != null && !shouldSendGoal(draft, goal) ? (
                  <Text className="text-[13px] text-muted-foreground mb-2">This is already your goal — change it or pick a new pace.</Text>
                ) : null}
              </Card>

              <Text className="text-[13px] font-semibold text-muted-foreground mt-5 mb-2 px-1 tracking-wide">HOW FAST DO YOU WANT TO GET THERE?</Text>
              <Card>
                {PACES.map((p) => (
                  <OptionRow key={p.id} selected={pace === p.id} label={p.label} desc={p.desc} onPress={() => setPace(p.id)} testID={`pace-${p.id}`} />
                ))}
                {etaWeeks != null && valid ? (
                  <Text className="text-[12px] text-muted-foreground mt-1">About {etaWeeks} weeks at {pace} pace{currentLbs != null ? ` from ~${currentLbs} lbs` : ''}.</Text>
                ) : null}
              </Card>

              <Text className="text-[13px] font-semibold text-muted-foreground mt-5 mb-2 px-1 tracking-wide">DAILY ACTIVITY</Text>
              <Card>
                {ACTIVITIES.map((a) => (
                  <OptionRow key={a.id} selected={activityLevel === a.id} label={a.label} desc={a.desc} onPress={() => setActivityLevel(a.id)} testID={`activity-${a.id}`} />
                ))}
              </Card>

              {missing?.length ? (
                <Card>
                  <Text className="font-bold text-ink mb-1">Calorie plan still needs</Text>
                  <Text className="text-[13px] text-muted-foreground mb-3">
                    Your {goal != null ? `${goal} lbs` : 'weight'} goal is saved. To compute Daily Targets we still need: {missing.map((f) => FIELD_LABEL[f] || f).join(', ')}.
                  </Text>
                  <PrimaryButton
                    title="Complete setup"
                    disabled={busy}
                    onPress={() => { setWizardOpen(false); router.push('/(onboarding)/gender'); }}
                  />
                </Card>
              ) : null}
              {planError ? (
                <Card>
                  <Text className="font-bold text-ink mb-1">Calorie plan did not update</Text>
                  <Text className="text-[13px] text-muted-foreground mb-3">
                    Your goal saved, but the server returned no plan (outdated backend or hiccup). Your Daily Targets are unchanged — retry to recompute.
                  </Text>
                  <PrimaryButton title={busy ? 'Retrying…' : 'Retry plan update'} disabled={!canSave} onPress={handleSave} />
                </Card>
              ) : null}

              <View className="mt-4">
                <PrimaryButton title={busy ? 'Saving…' : 'Save goal & update calorie plan'} disabled={!canSave} onPress={handleSave} />
                <View className="mt-2">
                  <PrimaryButton title={missing?.length || planError ? 'Close' : 'Cancel'} disabled={busy} onPress={() => setWizardOpen(false)} />
                </View>
                {error ? <Text className="text-destructive text-[13px] mt-2">{error}</Text> : null}
                <Text className="text-[12px] italic text-muted-foreground mt-3">
                  Your dailyGoalKcal recomputes from target + activity + pace with safe floors (never below BMR). Guidance is informational only.
                </Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
