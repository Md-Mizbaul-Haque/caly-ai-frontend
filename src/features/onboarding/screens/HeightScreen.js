import { memo, useCallback, useState } from 'react';
import { Text } from 'react-native';
import AuthScaffold from '../../../shared/components/auth/AuthScaffold';
import UnitToggle from '../../../shared/components/auth/UnitToggle';
import RulerSlider from '../../../shared/components/auth/RulerSlider';
import { useCompactAuth } from '../../../shared/components/auth/useCompact';
import { useOnboarding } from '../OnboardingContext';
import { CM_PER_IN } from '../../../shared/utils/nutrition';

function HeightScreen({ onNext, onBack }) {
  const { state, update, savePartial } = useOnboarding();
  const [busy, setBusy] = useState(false);
  const compact = useCompactAuth();
  const imperial = state.heightUnit !== 'cm';
  const slider = imperial
    ? { min: 48, max: 84, step: 1, value: Math.round(state.heightCm / CM_PER_IN) }
    : { min: 100, max: 250, step: 1, value: Math.round(state.heightCm) };
  // Single source of truth: the big display derives from the centered ruler
  // value (total inches), never from the raw float — center tick and number
  // always agree.
  const display = imperial
    ? `${Math.floor(slider.value / 12)}'${slider.value % 12}"`
    : `${slider.value} cm`;
  // Stable identity so the memoized ruler skips redundant re-renders.
  const handleRuler = useCallback((v) => update({ heightCm: imperial ? v * CM_PER_IN : v }), [imperial, update]);
  // One commit for unit + grid-snapped value: the ruler lands centered with
  // no follow-up correction renders, so the toggle feels instant.
  const handleUnit = useCallback((v) => update({
    heightUnit: v,
    heightCm: v === 'cm' ? Math.round(state.heightCm) : Math.round(state.heightCm / CM_PER_IN) * CM_PER_IN,
  }), [state.heightCm, update]);
  const handleCta = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const ok = await savePartial({ heightCm: Math.round(imperial ? slider.value * CM_PER_IN : slider.value) });
      if (ok) onNext();
    } finally {
      setBusy(false);
    }
    // slider derives from state; listed via its inputs.
  }, [busy, savePartial, imperial, slider.value, onNext]);
  return (
    <AuthScaffold onBack={onBack} title="How tall are you?" subtitle="This helps us calculate your daily calorie needs."
      ctaLabel={busy ? 'Saving…' : 'Next'} ctaDisabled={busy}
      onCta={handleCta}>
      <UnitToggle options={['ft/in', 'cm']} value={state.heightUnit} onChange={handleUnit} testID="height-unit" compact={compact} />
      <Text className={`text-center font-extrabold text-ink ${compact ? 'text-5xl mb-5' : 'text-[64px] mb-8'}`}>{display}</Text>
      <RulerSlider min={slider.min} max={slider.max} step={slider.step} value={slider.value} testID="height-ruler"
        onChange={handleRuler} />
    </AuthScaffold>
  );
}

export default memo(HeightScreen);
