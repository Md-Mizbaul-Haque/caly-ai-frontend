import { Text, View } from 'react-native';
import { Scale } from 'lucide-react-native';
import AuthScaffold from '../../components/auth/AuthScaffold';
import UnitToggle from '../../components/auth/UnitToggle';
import RulerSlider from '../../components/auth/RulerSlider';
import { useOnboarding } from './OnboardingContext';
import { goalLabel, kgToLb, lbToKg } from '../../utils/nutrition';

function round1(n) { return Math.round(n * 10) / 10; }

export default function TargetWeightScreen({ onNext, onBack }) {
  const { state, update, savePartial } = useOnboarding();
  const unit = state.targetUnit;
  const slider = unit === 'lb'
    ? { min: 66, max: 550, step: 1, value: Math.round(kgToLb(state.targetWeightKg)) }
    : { min: 30, max: 250, step: 0.5, value: Math.round(state.targetWeightKg * 2) / 2 };
  const display = unit === 'lb' ? `${Math.round(kgToLb(state.targetWeightKg))} lb` : `${round1(state.targetWeightKg)} kg`;
  const current = unit === 'lb' ? `${Math.round(kgToLb(state.weightKg))} lb` : `${round1(state.weightKg)} kg`;
  const label = goalLabel(state.weightKg, state.targetWeightKg);
  return (
    <AuthScaffold title="What is your target weight?" subtitle="This helps us determine your nutrition goals."
      onBack={onBack} ctaLabel="Next"
      onCta={async () => { await savePartial({ targetWeightKg: round1(state.targetWeightKg) }); onNext(); }}>
      <UnitToggle options={['lb', 'kg']} value={unit} onChange={(v) => update({ targetUnit: v })} testID="target-unit" />
      <Text className="text-center text-[64px] font-extrabold text-black">{display}</Text>
      <View className="flex-row items-center justify-center mt-2 mb-8">
        <Scale size={28} color="#000" />
        <Text className="text-[22px] font-medium text-black ml-2">{label}</Text>
      </View>
      <RulerSlider min={slider.min} max={slider.max} step={slider.step} value={slider.value} testID="target-ruler"
        onChange={(v) => update({ targetWeightKg: unit === 'lb' ? lbToKg(v) : v })} />
      <Text className="text-center text-[20px] text-black mt-6">Current: {current}</Text>
    </AuthScaffold>
  );
}
