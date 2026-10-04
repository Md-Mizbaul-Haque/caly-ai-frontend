import { useState } from 'react';
import { Text } from 'react-native';
import AuthScaffold from '../../../shared/components/auth/AuthScaffold';
import UnitToggle from '../../../shared/components/auth/UnitToggle';
import RulerSlider from '../../../shared/components/auth/RulerSlider';
import { useOnboarding } from '../OnboardingContext';
import { CM_PER_IN, cmToFtIn } from '../../../shared/utils/nutrition';

export default function HeightScreen({ onNext, onBack }) {
  const { state, update, savePartial } = useOnboarding();
  const [busy, setBusy] = useState(false);
  const imperial = state.heightUnit !== 'cm';
  const { ft, inch } = cmToFtIn(state.heightCm);
  const display = imperial ? `${ft}'${inch}"` : `${Math.round(state.heightCm)} cm`;
  const slider = imperial
    ? { min: 48, max: 84, step: 1, value: ft * 12 + inch }
    : { min: 100, max: 250, step: 1, value: Math.round(state.heightCm) };
  return (
    <AuthScaffold title="How tall are you?" subtitle="This helps us calculate your daily calorie needs."
      onBack={onBack} ctaLabel={busy ? 'Saving…' : 'Next'} ctaDisabled={busy}
      onCta={async () => { if (busy) return; setBusy(true); try { await savePartial({ heightCm: Math.round(state.heightCm) }); onNext(); } finally { setBusy(false); } }}>
      <UnitToggle options={['ft/in', 'cm']} value={state.heightUnit} onChange={(v) => update({ heightUnit: v })} testID="height-unit" />
      <Text className="text-center text-[64px] font-extrabold text-[#1A1A1A] mb-8">{display}</Text>
      <RulerSlider min={slider.min} max={slider.max} step={slider.step} value={slider.value} testID="height-ruler"
        onChange={(v) => update({ heightCm: imperial ? v * CM_PER_IN : v })} />
    </AuthScaffold>
  );
}
