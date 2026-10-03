import { Text, View } from 'react-native';
import AuthScaffold from '../../components/auth/AuthScaffold';
import RulerSlider from '../../components/auth/RulerSlider';
import { useOnboarding } from './OnboardingContext';
import { calcAge } from '../../utils/nutrition';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function daysInMonth(year, month1) {
  return new Date(year, month1, 0).getDate();
}

export default function BirthdayScreen({ onNext, onBack }) {
  const { state, update } = useOnboarding();
  const d = state.birthDate;
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  function setParts(ny, nm, nd) {
    const dim = daysInMonth(ny, nm);
    update({ birthDate: new Date(ny, nm - 1, Math.min(nd, dim)) });
  }
  return (
    <AuthScaffold title="When were you born?" subtitle="Please select your birthday so we can learn more about you!"
      onBack={onBack} ctaLabel="Next" ctaDisabled={calcAge(state.birthDate) < 13} onCta={onNext}>
      <Text className="text-center text-[22px] font-semibold text-black mb-6">{MONTHS[m - 1]} {day} {y}</Text>
      <Text className="text-[15px] text-black/50 mb-1 ml-1">Month</Text>
      <RulerSlider min={1} max={12} step={1} value={m} onChange={(v) => setParts(y, v, day)} testID="birth-month" />
      <View className="mb-4" />
      <Text className="text-[15px] text-black/50 mb-1 ml-1">Day</Text>
      <RulerSlider min={1} max={31} step={1} value={day} onChange={(v) => setParts(y, m, v)} testID="birth-day" />
      <View className="mb-4" />
      <Text className="text-[15px] text-black/50 mb-1 ml-1">Year</Text>
      <RulerSlider min={1930} max={2015} step={1} value={Math.min(2015, Math.max(1930, y))} onChange={(v) => setParts(v, m, day)} testID="birth-year" />
    </AuthScaffold>
  );
}
