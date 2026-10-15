import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Check } from '../../../shared/components/ui/icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomCTA from '../../../shared/components/auth/BottomCTA';
import MacroDots from '../../../shared/components/auth/MacroDots';
import { useOnboarding } from '../OnboardingContext';
import { apiPut, apiPost } from '../../../shared/lib/api';
import { toastError } from '../../../shared/utils/toast';
import { calcAge, cmToFtIn, goalLabel, kgToLb, missingOnboardingFields, normalizeBirthDate, snapWeightKg } from '../../../shared/utils/nutrition';

function round1(n) { return Math.round(n * 10) / 10; }

const ACTIVITY_SHORT = { sedentary: 'Sedentary', light: 'Light', moderate: 'Moderate', high: 'High' };
const GOAL_CARD = {
  'Maintain Weight': { title: 'Maintenance', body: 'Maintain your current weight and build healthy habits' },
  'Lose Weight': { title: 'Weight Loss', body: 'Lose weight steadily and build healthy habits' },
  'Gain Weight': { title: 'Weight Gain', body: 'Gain weight steadily and build healthy habits' },
};
const FIELD_LABEL = {
  gender: 'Gender',
  birthDate: 'Birth date (13+ to use Caly AI)',
  heightCm: 'Height',
  weightKg: 'Current weight',
  targetWeightKg: 'Target weight',
  activityLevel: 'Activity level',
};

function Row({ label, value }) {
  return (
    <View className="flex-row justify-between items-center py-3">
      <Text className="text-[18px] text-muted-foreground">{label}</Text>
      <Text className="text-[18px] font-medium text-ink">{value}</Text>
    </View>
  );
}

export default function NutritionPlanScreen({ onNext }) {
  const insets = useSafeAreaInsets();
  const { state } = useOnboarding();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  // The plan shown here is the SERVER's plan (POST /api/plan/calculate), the
  // exact math that gets stored as dailyGoalKcal. Rendering a client-side
  // maintenance number instead showed a different target than Home used.
  const [planState, setPlanState] = useState({ key: '', plan: null });
  // Completeness gate: plan renders/saves ONLY when every field is present.
  // normalizeBirthDate accepts Date (local flow) or ISO string (hydrated).
  const birthDate = normalizeBirthDate(state.birthDate);
  const missing = missingOnboardingFields({ ...state, birthDate });
  const complete = missing.length === 0;
  const age = birthDate ? calcAge(birthDate) : NaN;
  // Keep the local label only as a fallback until the server plan lands.
  const label = complete
    ? goalLabel(snapWeightKg(state.weightKg, state.weightUnit), snapWeightKg(state.targetWeightKg, state.targetUnit))
    : 'Maintain Weight';
  // Key from the exact inputs the plan depends on: a plan whose key no longer
  // matches the current inputs is treated as absent (never a stale target).
  const planKey = complete && birthDate
    ? [state.gender, birthDate.toISOString(), Math.round(state.heightCm), round1(state.weightKg), round1(state.targetWeightKg), state.activityLevel].join('|')
    : '';

  // Fetch the server plan whenever the inputs change. The server owns the
  // deficit/floors, so this is the only number that matches what gets stored.
  useEffect(() => {
    if (!planKey) return undefined;
    let alive = true;
    apiPost('/api/plan/calculate', {
      gender: state.gender,
      birthDate: birthDate.toISOString(),
      heightCm: Math.round(state.heightCm),
      weightKg: round1(state.weightKg),
      targetWeightKg: round1(state.targetWeightKg),
      activityLevel: state.activityLevel,
    })
      .then(({ plan }) => { if (alive) setPlanState({ key: planKey, plan: plan || null }); })
      .catch(() => { if (alive) setPlanState({ key: planKey, plan: null }); });
    return () => { alive = false; };
    // planKey encodes every input read above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planKey]);

  const serverPlan = planState.key === planKey ? planState.plan : null;
  const validPlan = !!serverPlan && Number.isFinite(serverPlan.dailyGoalKcal)
    && serverPlan.dailyGoalKcal >= 500 && serverPlan.dailyGoalKcal <= 10000;
  const goal = GOAL_CARD[serverPlan?.goal || label] || GOAL_CARD[label];
  const { ft, inch } = cmToFtIn(state.heightCm || 0);
  const heightStr = state.heightUnit === 'cm' ? `${Math.round(state.heightCm || 0)} cm` : `${ft}'${inch}"`;
  const weightStr = state.weightUnit === 'lb' ? `${Math.round(kgToLb(state.weightKg || 0))} lb` : `${round1(state.weightKg || 0).toFixed(1)} kg`;

  async function finish() {
    if (!complete || !birthDate) {
      setFailed(true);
      toastError('Finish your details first', `Missing: ${missing.map((f) => FIELD_LABEL[f] || f).join(', ')}. Use your device's back button to complete each step.`);
      return;
    }
    setBusy(true);
    setFailed(false);
    try {
      // Server recomputes dailyGoalKcal from THESE inputs (client number is
      // ignored) and refuses to mark onboarding complete unless ALL fields
      // validate — per-user (JWT sub), never another user's data.
      await apiPut('/api/auth/profile', {
        gender: state.gender,
        birthDate: birthDate.toISOString(),
        heightCm: Math.round(state.heightCm),
        weightKg: round1(state.weightKg),
        targetWeightKg: round1(state.targetWeightKg),
        activityLevel: state.activityLevel,
        onboardingCompleted: true,
      });
      onNext();
    } catch (e) {
      setFailed(true);
      const miss = e.data && Array.isArray(e.data.missing) && e.data.missing.length
        ? ` Missing: ${e.data.missing.map((f) => FIELD_LABEL[f] || f).join(', ')}.`
        : '';
      toastError('Could not save plan', `${e.message}.${miss}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView className="flex-1 px-6 pt-6" contentContainerStyle={{ paddingBottom: 16 }}>
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-[26px] font-extrabold text-ink">Your Nutrition Plan</Text>
          <View className="w-9 h-9 rounded-full border-2 border-[#f2470c] bg-accent items-center justify-center">
            <Check size={20} color="#f2470c" />
          </View>
        </View>
        {!complete && (
          <View className="bg-accent rounded-3xl p-5 mb-5 border border-[#f2470c]">
            <Text className="text-[17px] font-semibold text-ink mb-1">A few details are still missing</Text>
            <Text className="text-[15px] text-muted-foreground">Missing: {missing.map((f) => FIELD_LABEL[f] || f).join(', ')}. Use your device&apos;s back button to complete each step — your plan is created only after all information is received.</Text>
          </View>
        )}
        <Text className="text-[22px] font-bold text-ink mb-2">Your Goal</Text>
        <View className="bg-card rounded-3xl p-5 mb-5 border border-border">
          <Text className="text-[20px] font-semibold text-ink mb-1">{goal.title}</Text>
          <Text className="text-[16px] text-muted-foreground">{goal.body}</Text>
        </View>
        <Text className="text-[22px] font-bold text-ink mb-1">Daily Targets</Text>
        <Text className="text-[15px] text-muted-foreground mb-3">Your personalized nutrition plan. You can adjust these targets later.</Text>
        <View className="bg-card rounded-3xl p-5 mb-5 border border-border">
          {validPlan ? (
            <>
              <Text className="text-[40px] font-extrabold text-ink">{serverPlan.dailyGoalKcal} <Text className="text-[20px] font-normal text-muted-foreground">calories</Text></Text>
              <MacroDots proteinG={serverPlan.proteinG} fatG={serverPlan.fatG} carbsG={serverPlan.carbsG} />
            </>
          ) : (
            <Text className="text-[16px] text-muted-foreground">Your calorie and macro targets will appear here once all steps are complete.</Text>
          )}
        </View>
        <Text className="text-[22px] font-bold text-ink mb-2">Details</Text>
        <View className="bg-card rounded-3xl px-5 py-2 mb-4 border border-border">
          <Row label="Age" value={Number.isFinite(age) ? `${age} years` : '—'} />
          <Row label="Height" value={state.heightCm ? heightStr : '—'} />
          <Row label="Weight" value={state.weightKg ? weightStr : '—'} />
          <Row label="Activity Level" value={ACTIVITY_SHORT[state.activityLevel] || '—'} />
          <Row label="BMR (Base Rate)" value={validPlan ? `${serverPlan.bmr} cal` : '—'} />
          <Row label="AMR (Active Rate)" value={validPlan ? `${serverPlan.maintenance} cal` : '—'} />
        </View>
        <View className="flex-row mb-2">
          <View className="w-6 h-6 rounded-full bg-[#f2470c] items-center justify-center mr-2 mt-0.5">
            <Text className="text-white text-[13px] font-bold">!</Text>
          </View>
          <View className="flex-1">
            {(validPlan && serverPlan.warnings?.length ? serverPlan.warnings : ['Dietary guidance is for informational purposes only. Consult your healthcare provider before making changes, especially with existing health conditions.']).map((w, i) => (
              <Text key={i} className="text-[13px] italic text-muted-foreground mb-1">{w}</Text>
            ))}
          </View>
        </View>
      </ScrollView>
      <View className="px-6" style={{ paddingBottom: Math.max(insets.bottom, 32) + 20 }}>
        <BottomCTA label={busy ? 'Saving…' : !complete ? 'Complete missing steps' : failed ? 'Retry' : "Let's Get Started"} onPress={finish} disabled={busy || !complete} testID="plan-done" />
      </View>
    </View>
  );
}
