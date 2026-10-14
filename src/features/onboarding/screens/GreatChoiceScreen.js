import { Text, View } from 'react-native';
import { PartyPopper } from '../../../shared/components/ui/icons';
import AuthScaffold from '../../../shared/components/auth/AuthScaffold';
import { useOnboarding } from '../OnboardingContext';
import { goalLabel, snapWeightKg } from '../../../shared/utils/nutrition';

const COPY = {
  'Maintain Weight': {
    head: 'Maintaining your current weight is a healthy goal.',
    mid: "We'll help you track your nutrition and activity to stay within your maintenance range.",
  },
  'Lose Weight': {
    head: 'Losing weight steadily is a healthy goal.',
    mid: "We'll help you track your nutrition and activity to reach your target safely.",
  },
  'Gain Weight': {
    head: 'Gaining weight steadily is a healthy goal.',
    mid: "We'll help you track your nutrition and activity to build toward your target.",
  },
};

export default function GreatChoiceScreen({ onNext }) {
  const { state } = useOnboarding();
  // Label from the same snapped grid values the rulers display, so the copy
  // can never contradict the numbers the user just saw.
  const label = goalLabel(
    snapWeightKg(state.weightKg, state.weightUnit),
    snapWeightKg(state.targetWeightKg, state.targetUnit)
  );
  const copy = COPY[label];
  return (
    <AuthScaffold title="Great choice!" titleColor="#f2470c" ctaLabel="See your plan" onCta={onNext}>
      <View className="items-center mt-2 mb-6">
        <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: '#FFF1E9', alignItems: 'center', justifyContent: 'center' }}>
          <PartyPopper size={44} color="#f2470c" />
        </View>
      </View>
      <Text className="text-[24px] font-semibold text-[#1A1A1A] leading-[32px] mb-5">{copy.head}</Text>
      <Text className="text-[19px] text-[#1A1A1A] leading-[28px] mb-5">{copy.mid}</Text>
      <Text className="text-[19px] text-[#1A1A1A] leading-[28px]">Consistency is key to long-term success.</Text>
    </AuthScaffold>
  );
}
