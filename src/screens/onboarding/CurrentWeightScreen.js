import { useState } from 'react';
import { Text } from 'react-native';
import AuthScaffold from '../../shared/components/auth/AuthScaffold';
import UnitToggle from '../../shared/components/auth/UnitToggle';
import RulerSlider from '../../shared/components/auth/RulerSlider';
import { useOnboarding } from './OnboardingContext';
import { kgToLb, lbToKg } from '../../shared/utils/nutrition';

function round1(n) { return Math.round(n * 10) / 10; }

export default function CurrentWeightScreen({ onNext, onBack }) {
  const { state, update, savePartial } = useOnboarding();
  const [busy, setBusy] = useState(false);
  const unit = state.weightUnit;
  const slider = unit === 'lb'
    ? { min: 66, max: 550, step: 1, value: Math.round(kgToLb(state.weightKg)) }
    : { min: 30, max: 250, step: 0.5, value: Math.round(state.weightKg * 2) / 2 };
  const display = unit === 'lb' ? `${Math.round(kgToLb(state.weightKg))} lb` : `${round1(state.weightKg)} kg`;
  return (
    <AuthScaffold title="What is your current weight?" subtitle="This helps us calculate your daily calorie needs."
      onBack={onBack} ctaLabel={busy ? 'Saving…' : 'Next'} ctaDisabled={busy}
      onCta={async () => { if (busy) return; setBusy(true); try { await savePartial({ weightKg: round1(state.weightKg) }); onNext(); } finally { setBusy(false); } }}>
      <UnitToggle options={['lb', 'kg']} value={unit} onChange={(v) => update({ weightUnit: v })} testID="weight-unit" />
      <Text className="text-center text-[64px] font-extrabold text-[#1A1A1A] mb-8">{display}</Text>
      <RulerSlider min={slider.min} max={slider.max} step={slider.step} value={slider.value} testID="weight-ruler"
        onChange={(v) => update({ weightKg: unit === 'lb' ? lbToKg(v) : v })} />
    </AuthScaffold>
  );
}
