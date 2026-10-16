import { memo, useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { Scale } from '../../../shared/components/ui/icons';
import AuthScaffold from '../../../shared/components/auth/AuthScaffold';
import UnitToggle from '../../../shared/components/auth/UnitToggle';
import RulerSlider from '../../../shared/components/auth/RulerSlider';
import { useCompactAuth } from '../../../shared/components/auth/useCompact';
import { useOnboarding } from '../OnboardingContext';
import { goalLabel, lbToKg, snapWeight, snapWeightKg } from '../../../shared/utils/nutrition';
import { PRIMARY } from '../../../shared/theme/colors';

function round1(n) { return Math.round(n * 10) / 10; }

function TargetWeightScreen({ onNext, onBack }) {
  const { state, update, savePartial } = useOnboarding();
  const [busy, setBusy] = useState(false);
  const compact = useCompactAuth();
  const unit = state.targetUnit;
  // Single source of truth: snapped grid values feed the ruler position, the
  // big display, the Current line AND the goal label, so they always agree.
  const shownTarget = snapWeight(state.targetWeightKg, unit);
  const shownCurrent = snapWeight(state.weightKg, unit);
  const toKg = (s) => (unit === 'lb' ? lbToKg(s) : s);
  const slider = unit === 'lb'
    ? { min: 66, max: 550, step: 1, value: shownTarget }
    : { min: 30, max: 250, step: 0.5, value: shownTarget };
  const display = unit === 'lb' ? `${shownTarget} lb` : `${round1(shownTarget)} kg`;
  const current = unit === 'lb' ? `${shownCurrent} lb` : `${round1(shownCurrent)} kg`;
  const label = goalLabel(toKg(shownCurrent), toKg(shownTarget));
  // Stable identity so the memoized ruler skips redundant re-renders.
  const handleRuler = useCallback((v) => update({ targetWeightKg: unit === 'lb' ? lbToKg(v) : v }), [unit, update]);
  // One commit for unit + grid-snapped value: the ruler lands centered with
  // no follow-up correction renders, so the toggle feels instant.
  const handleUnit = useCallback((v) => update({
    targetUnit: v,
    targetWeightKg: v === 'kg' ? snapWeight(state.targetWeightKg, 'kg') : snapWeightKg(state.targetWeightKg, 'lb'),
  }), [state.targetWeightKg, update]);
  const handleCta = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const ok = await savePartial({ targetWeightKg: round1(toKg(shownTarget)) });
      if (ok) onNext();
    } finally {
      setBusy(false);
    }
    // shownTarget/toKg derive from state; listed via their inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, savePartial, shownTarget, unit, onNext]);
  return (
    <AuthScaffold onBack={onBack} title="What is your target weight?" subtitle="This helps us determine your nutrition goals."
      ctaLabel={busy ? 'Saving…' : 'Next'} ctaDisabled={busy}
      onCta={handleCta}>
      <UnitToggle options={['lb', 'kg']} value={unit} onChange={handleUnit} testID="target-unit" compact={compact} />
      <Text className={`text-center font-extrabold text-ink ${compact ? 'text-5xl' : 'text-[64px]'}`}>{display}</Text>
      <View className={`flex-row items-center justify-center ${compact ? 'mt-1 mb-4' : 'mt-2 mb-8'}`}>
        <Scale size={28} color={PRIMARY} />
        <Text className="text-[22px] font-medium text-ink ml-2">{label}</Text>
      </View>
      <RulerSlider min={slider.min} max={slider.max} step={slider.step} value={slider.value} testID="target-ruler"
        onChange={handleRuler} />
      <Text className={`text-center text-[20px] text-ink ${compact ? 'mt-3' : 'mt-6'}`}>Current: {current}</Text>
    </AuthScaffold>
  );
}

export default memo(TargetWeightScreen);
