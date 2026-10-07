import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Check, ChevronLeft } from '../../../shared/components/ui/icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomCTA from '../../../shared/components/auth/BottomCTA';
import MacroDots from '../../../shared/components/auth/MacroDots';
import { useOnboarding } from '../OnboardingContext';
import { apiPut } from '../../../shared/lib/api';
import { toastError } from '../../../shared/utils/toast';
import { calcAge, calcPlan, cmToFtIn, goalLabel, kgToLb, missingOnboardingFields, normalizeBirthDate, snapWeightKg } from '../../../shared/utils/nutrition';

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
      <Text className="text-[18px] text-[#8A8A8A]">{label}</Text>
      <Text className="text-[18px] font-medium text-[#1A1A1A]">{value}</Text>
    </View>
  );
}

export default function NutritionPlanScreen({ onNext, onBack }) {
  const insets = useSafeAreaInsets();
  const { state } = useOnboarding();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  // Plain-object style only (see BottomCTA): pressed state tracked manually.
  const [backPressed, setBackPressed] = useState(false);
  // Completeness gate: plan renders/saves ONLY when every field is present.
  // normalizeBirthDate accepts Date (local flow) or ISO string (hydrated).
  const birthDate = normalizeBirthDate(state.birthDate);
  const missing = missingOnboardingFields({ ...state, birthDate });
  const complete = missing.length === 0;
  const age = birthDate ? calcAge(birthDate) : NaN;
  const plan = complete
    ? calcPlan({ gender: state.gender, weightKg: state.weightKg, heightCm: state.heightCm, age, activityLevel: state.activityLevel, targetWeightKg: state.targetWeightKg })
    : null;
  const validPlan = complete && Number.isFinite(plan.amr) && plan.amr >= 500 && plan.amr <= 10000;
  // Label from the same snapped grid values the rulers display.
  const label = complete
    ? goalLabel(snapWeightKg(state.weightKg, state.weightUnit), snapWeightKg(state.targetWeightKg, state.targetUnit))
    : 'Maintain Weight';
  const goal = GOAL_CARD[label];
  const { ft, inch } = cmToFtIn(state.heightCm || 0);
  const heightStr = state.heightUnit === 'cm' ? `${Math.round(state.heightCm || 0)} cm` : `${ft}'${inch}"`;
  const weightStr = state.weightUnit === 'lb' ? `${Math.round(kgToLb(state.weightKg || 0))} lb` : `${round1(state.weightKg || 0).toFixed(1)} kg`;

  async function finish() {
    if (!complete || !birthDate) {
      setFailed(true);
      toastError('Finish your details first', `Missing: ${missing.map((f) => FIELD_LABEL[f] || f).join(', ')}. Go back to complete each step.`);
      return;
    }
    setBusy(true);
    setFailed(false);
    try {
      // Server recomputes dailyGoalKcal from THESE inputs (client number is
      // ignored) and refuses to mark onboarding complete unless ALL fields
      // validate — per-user (JWT sub), never another user's data.
      const { plan: serverPlan } = await apiPut('/api/auth/profile', {
        gender: state.gender,
        birthDate: birthDate.toISOString(),
        heightCm: Math.round(state.heightCm),
        weightKg: round1(state.weightKg),
        targetWeightKg: round1(state.targetWeightKg),
        activityLevel: state.activityLevel,
        onboardingCompleted: true,
      });
      void serverPlan;
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
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1 px-6 pt-6" contentContainerStyle={{ paddingBottom: 16 }}>
        <Pressable onPress={onBack} testID="plan-back" accessibilityRole="button" accessibilityLabel="Go back"
          onPressIn={() => setBackPressed(true)}
          onPressOut={() => setBackPressed(false)}
          className="w-12 h-12 rounded-2xl border border-[#F1E8E0] bg-white items-center justify-center mb-4"
          style={{ opacity: backPressed ? 0.6 : 1 }}>
          <ChevronLeft size={26} color="#1A1A1A" />
        </Pressable>
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-[26px] font-extrabold text-[#1A1A1A]">Your Nutrition Plan</Text>
          <View className="w-9 h-9 rounded-full border-2 border-[#f2470c] bg-[#FFF1E9] items-center justify-center">
            <Check size={20} color="#f2470c" />
          </View>
        </View>
        {!complete && (
          <View className="bg-[#FFF1E9] rounded-3xl p-5 mb-5 border border-[#f2470c]">
            <Text className="text-[17px] font-semibold text-[#1A1A1A] mb-1">A few details are still missing</Text>
            <Text className="text-[15px] text-[#8A8A8A]">Missing: {missing.map((f) => FIELD_LABEL[f] || f).join(', ')}. Use the back button to complete each step — your plan is created only after all information is received.</Text>
          </View>
        )}
        <Text className="text-[22px] font-bold text-[#1A1A1A] mb-2">Your Goal</Text>
        <View className="bg-white rounded-3xl p-5 mb-5 border border-[#F1E8E0]">
          <Text className="text-[20px] font-semibold text-[#1A1A1A] mb-1">{goal.title}</Text>
          <Text className="text-[16px] text-[#8A8A8A]">{goal.body}</Text>
        </View>
        <Text className="text-[22px] font-bold text-[#1A1A1A] mb-1">Daily Targets</Text>
        <Text className="text-[15px] text-[#8A8A8A] mb-3">Your personalized nutrition plan. You can adjust these targets later.</Text>
        <View className="bg-white rounded-3xl p-5 mb-5 border border-[#F1E8E0]">
          {validPlan ? (
            <>
              <Text className="text-[40px] font-extrabold text-[#1A1A1A]">{plan.amr} <Text className="text-[20px] font-normal text-[#8A8A8A]">calories</Text></Text>
              <MacroDots proteinG={plan.proteinG} fatG={plan.fatG} carbsG={plan.carbsG} />
            </>
          ) : (
            <Text className="text-[16px] text-[#8A8A8A]">Your calorie and macro targets will appear here once all steps are complete.</Text>
          )}
        </View>
        <Text className="text-[22px] font-bold text-[#1A1A1A] mb-2">Details</Text>
        <View className="bg-white rounded-3xl px-5 py-2 mb-4 border border-[#F1E8E0]">
          <Row label="Age" value={Number.isFinite(age) ? `${age} years` : '—'} />
          <Row label="Height" value={state.heightCm ? heightStr : '—'} />
          <Row label="Weight" value={state.weightKg ? weightStr : '—'} />
          <Row label="Activity Level" value={ACTIVITY_SHORT[state.activityLevel] || '—'} />
          <Row label="BMR (Base Rate)" value={validPlan ? `${plan.bmr} cal` : '—'} />
          <Row label="AMR (Active Rate)" value={validPlan ? `${plan.amr} cal` : '—'} />
        </View>
        <View className="flex-row mb-2">
          <View className="w-6 h-6 rounded-full bg-[#f2470c] items-center justify-center mr-2 mt-0.5">
            <Text className="text-white text-[13px] font-bold">!</Text>
          </View>
          <Text className="flex-1 text-[13px] italic text-[#8A8A8A]">Dietary guidance is for informational purposes only. Consult your healthcare provider before making changes, especially with existing health conditions.</Text>
        </View>
      </ScrollView>
      <View className="px-6" style={{ paddingBottom: Math.max(insets.bottom, 32) + 20 }}>
        <BottomCTA label={busy ? 'Saving…' : !complete ? 'Complete missing steps' : failed ? 'Retry' : "Let's Get Started"} onPress={finish} disabled={busy || !complete} testID="plan-done" />
      </View>
    </View>
  );
}
