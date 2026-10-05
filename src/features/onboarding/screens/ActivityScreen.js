import { useState } from 'react';
import { View } from 'react-native';
import { Bike, Dumbbell, Footprints, Sofa } from 'lucide-react-native';
import AuthScaffold from '../../../shared/components/auth/AuthScaffold';
import OptionCard from '../../../shared/components/auth/OptionCard';
import { useOnboarding } from '../OnboardingContext';

const OPTIONS = [
  { key: 'sedentary', title: 'Sedentary', subtitle: 'Little or no exercise, desk job', Icon: Sofa },
  { key: 'light', title: 'Lightly Active', subtitle: 'Light exercise 1-3 days/week', Icon: Footprints },
  { key: 'moderate', title: 'Moderately Active', subtitle: 'Moderate exercise 3-5 days/week', Icon: Bike },
  { key: 'high', title: 'Highly Active', subtitle: 'Hard exercise 6-7 days/week', Icon: Dumbbell },
];

export default function ActivityScreen({ onNext, onBack }) {
  const { state, update, savePartial } = useOnboarding();
  const [busy, setBusy] = useState(false);
  async function goNext() {
    if (busy) return;
    setBusy(true);
    try {
      await savePartial({ activityLevel: state.activityLevel });
      onNext();
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthScaffold title="Lifestyle Activity" subtitle="This step will adjust targets based on your daily caloric burn."
      onBack={onBack} ctaLabel={busy ? 'Saving…' : 'Next'} ctaDisabled={!state.activityLevel || busy}
      onCta={goNext}>
      <View style={{ gap: 12 }}>
        {OPTIONS.map(({ key, title, subtitle, Icon }) => {
          const selected = state.activityLevel === key;
          return (
            <OptionCard key={key} title={title} subtitle={subtitle} selected={selected}
              onPress={() => update({ activityLevel: key })} icon={<Icon size={28} color={selected ? '#f2470c' : '#1A1A1A'} />} testID={`activity-${key}`} />
          );
        })}
      </View>
    </AuthScaffold>
  );
}
