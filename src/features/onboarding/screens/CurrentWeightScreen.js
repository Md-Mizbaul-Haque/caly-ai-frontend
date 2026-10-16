import { memo, useCallback, useState } from 'react';
import { Text } from 'react-native';
import AuthScaffold from '../../../shared/components/auth/AuthScaffold';
import UnitToggle from '../../../shared/components/auth/UnitToggle';
import RulerSlider from '../../../shared/components/auth/RulerSlider';
import { useCompactAuth } from '../../../shared/components/auth/useCompact';
import { useOnboarding } from '../OnboardingContext';
import { lbToKg, snapWeight, snapWeightKg } from '../../../shared/utils/nutrition';

function round1(n) { return Math.round(n * 10) / 10; }

function CurrentWeightScreen({ onNext, onBack }) {
  const { state, update, savePartial } = useOnboarding();
  const [busy, setBusy] = useState(false);
  const compact = useCompactAuth();
  const unit = state.weightUnit;
  // Single source of truth: the snapped grid value feeds the ruler position
  // AND the big display, so the center tick and the number always agree.
  const shown = snapWeight(state.weightKg, unit);
  const slider = unit === 'lb'
    ? { min: 66, max: 550, step: 1, value: shown }
    : { min: 30, max: 250, step: 0.5, value: shown };
  const display = unit === 'lb' ? `${shown} lb` : `${round1(shown)} kg`;
  // Stable identity so the memoized ruler skips redundant re-renders.
  const handleRuler = useCallback((v) => update({ weightKg: unit === 'lb' ? lbToKg(v) : v }), [unit, update]);
  // One commit for unit + grid-snapped value: the ruler lands centered with
  // no follow-up correction renders, so the toggle feels instant.
  const handleUnit = useCallback((v) => update({
    weightUnit: v,
    weightKg: v === 'kg' ? snapWeight(state.weightKg, 'kg') : snapWeightKg(state.weightKg, 'lb'),
  }), [state.weightKg, update]);
  const handleCta = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const ok = await savePartial({ weightKg: round1(unit === 'lb' ? lbToKg(shown) : shown) });
      if (ok) onNext();
    } finally {
      setBusy(false);
    }
    // shown derives from state; listed via its inputs.
  }, [busy, savePartial, unit, shown, onNext]);
  return (
    <AuthScaffold onBack={onBack} title="What is your current weight?" subtitle="This helps us calculate your daily calorie needs."
      ctaLabel={busy ? 'Saving…' : 'Next'} ctaDisabled={busy}
      onCta={handleCta}>
      <UnitToggle options={['lb', 'kg']} value={unit} onChange={handleUnit} testID="weight-unit" compact={compact} />
      <Text className={`text-center font-extrabold text-ink ${compact ? 'text-5xl mb-5' : 'text-[64px] mb-8'}`}>{display}</Text>
      <RulerSlider min={slider.min} max={slider.max} step={slider.step} value={slider.value} testID="weight-ruler"
        onChange={handleRuler} />
    </AuthScaffold>
  );
}

export default memo(CurrentWeightScreen);
