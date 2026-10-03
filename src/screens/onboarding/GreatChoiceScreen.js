import { Text } from 'react-native';
import AuthScaffold from '../../components/auth/AuthScaffold';
import { useOnboarding } from './OnboardingContext';
import { goalLabel } from '../../utils/nutrition';

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

export default function GreatChoiceScreen({ onNext, onBack }) {
  const { state } = useOnboarding();
  const label = goalLabel(state.weightKg, state.targetWeightKg);
  const copy = COPY[label];
  return (
    <AuthScaffold title="Great choice!" titleColor="#2D9CDB" onBack={onBack} ctaLabel="See your plan" onCta={onNext}>
      <Text className="text-[24px] font-semibold text-black leading-[32px] mb-5">{copy.head}</Text>
      <Text className="text-[19px] text-black leading-[28px] mb-5">{copy.mid}</Text>
      <Text className="text-[19px] text-black leading-[28px]">Consistency is key to long-term success.</Text>
    </AuthScaffold>
  );
}
