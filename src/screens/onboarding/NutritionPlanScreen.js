import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Check, ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomCTA from '../../shared/components/auth/BottomCTA';
import MacroDots from '../../shared/components/auth/MacroDots';
import { useOnboarding } from './OnboardingContext';
import { apiPut } from '../../shared/lib/api';
import { toastError } from '../../shared/utils/toast';
import { calcAge, calcPlan, cmToFtIn, goalLabel, kgToLb } from '../../shared/utils/nutrition';

function round1(n) { return Math.round(n * 10) / 10; }

const ACTIVITY_SHORT = { sedentary: 'Sedentary', light: 'Light', moderate: 'Moderate', high: 'High' };
const GOAL_CARD = {
  'Maintain Weight': { title: 'Maintenance', body: 'Maintain your current weight and build healthy habits' },
  'Lose Weight': { title: 'Weight Loss', body: 'Lose weight steadily and build healthy habits' },
  'Gain Weight': { title: 'Weight Gain', body: 'Gain weight steadily and build healthy habits' },
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
  const age = calcAge(state.birthDate);
  const plan = calcPlan({ gender: state.gender, weightKg: state.weightKg, heightCm: state.heightCm, age, activityLevel: state.activityLevel });
  const label = goalLabel(state.weightKg, state.targetWeightKg);
  const goal = GOAL_CARD[label];
  const { ft, inch } = cmToFtIn(state.heightCm);
  const heightStr = state.heightUnit === 'cm' ? `${Math.round(state.heightCm)} cm` : `${ft}'${inch}"`;
  const weightStr = state.weightUnit === 'lb' ? `${Math.round(kgToLb(state.weightKg))} lb` : `${round1(state.weightKg).toFixed(1)} kg`;

  async function finish() {
    setBusy(true);
    setFailed(false);
    try {
      await apiPut('/api/auth/profile', {
        gender: state.gender,
        birthDate: state.birthDate.toISOString(),
        heightCm: Math.round(state.heightCm),
        weightKg: round1(state.weightKg),
        targetWeightKg: round1(state.targetWeightKg),
        activityLevel: state.activityLevel,
        dailyGoalKcal: plan.amr,
        onboardingCompleted: true,
      });
      onNext();
    } catch (e) {
      setFailed(true);
      toastError('Could not save plan', e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1 px-6 pt-6" contentContainerStyle={{ paddingBottom: 16 }}>
        <Pressable onPress={onBack} testID="plan-back" accessibilityRole="button"
          className="w-12 h-12 rounded-2xl border border-[#F1E8E0] bg-white items-center justify-center mb-4"
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <ChevronLeft size={26} color="#1A1A1A" />
        </Pressable>
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-[26px] font-extrabold text-[#1A1A1A]">Your Nutrition Plan</Text>
          <View className="w-9 h-9 rounded-full border-2 border-[#FF6B35] bg-[#FFF1E9] items-center justify-center">
            <Check size={20} color="#FF6B35" />
          </View>
        </View>
        <Text className="text-[22px] font-bold text-[#1A1A1A] mb-2">Your Goal</Text>
        <View className="bg-white rounded-3xl p-5 mb-5 border border-[#F1E8E0]">
          <Text className="text-[20px] font-semibold text-[#1A1A1A] mb-1">{goal.title}</Text>
          <Text className="text-[16px] text-[#8A8A8A]">{goal.body}</Text>
        </View>
        <Text className="text-[22px] font-bold text-[#1A1A1A] mb-1">Daily Targets</Text>
        <Text className="text-[15px] text-[#8A8A8A] mb-3">Your personalized nutrition plan. You can adjust these targets later.</Text>
        <View className="bg-white rounded-3xl p-5 mb-5 border border-[#F1E8E0]">
          <Text className="text-[40px] font-extrabold text-[#1A1A1A]">{plan.amr} <Text className="text-[20px] font-normal text-[#8A8A8A]">calories</Text></Text>
          <MacroDots proteinG={plan.proteinG} fatG={plan.fatG} carbsG={plan.carbsG} />
        </View>
        <Text className="text-[22px] font-bold text-[#1A1A1A] mb-2">Details</Text>
        <View className="bg-white rounded-3xl px-5 py-2 mb-4 border border-[#F1E8E0]">
          <Row label="Age" value={`${age} years`} />
          <Row label="Height" value={heightStr} />
          <Row label="Weight" value={weightStr} />
          <Row label="Activity Level" value={ACTIVITY_SHORT[state.activityLevel]} />
          <Row label="BMR (Base Rate)" value={`${plan.bmr} cal`} />
          <Row label="AMR (Active Rate)" value={`${plan.amr} cal`} />
        </View>
        <View className="flex-row mb-2">
          <View className="w-6 h-6 rounded-full bg-[#FF6B35] items-center justify-center mr-2 mt-0.5">
            <Text className="text-white text-[13px] font-bold">!</Text>
          </View>
          <Text className="flex-1 text-[13px] italic text-[#8A8A8A]">Dietary guidance is for informational purposes only. Consult your healthcare provider before making changes, especially with existing health conditions.</Text>
        </View>
      </ScrollView>
      <View className="px-6" style={{ paddingBottom: Math.max(insets.bottom, 32) + 20 }}>
        <BottomCTA label={busy ? 'Saving…' : failed ? 'Retry' : "Let's Get Started"} onPress={finish} disabled={busy} testID="plan-done" />
      </View>
    </View>
  );
}
