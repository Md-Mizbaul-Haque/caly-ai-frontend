import { View } from 'react-native';
import { Bike, Dumbbell, Footprints, Sofa } from 'lucide-react-native';
import AuthScaffold from '../../components/auth/AuthScaffold';
import OptionCard from '../../components/auth/OptionCard';
import { useOnboarding } from './OnboardingContext';

const OPTIONS = [
  { key: 'sedentary', title: 'Sedentary', subtitle: 'Little or no exercise, desk job', Icon: Sofa },
  { key: 'light', title: 'Lightly Active', subtitle: 'Light exercise 1-3 days/week', Icon: Footprints },
  { key: 'moderate', title: 'Moderately Active', subtitle: 'Moderate exercise 3-5 days/week', Icon: Bike },
  { key: 'high', title: 'Highly Active', subtitle: 'Hard exercise 6-7 days/week', Icon: Dumbbell },
];

export default function ActivityScreen({ onNext, onBack }) {
  const { state, update, savePartial } = useOnboarding();
  return (
    <AuthScaffold title="Lifestyle Activity" subtitle="This step will adjust targets based on your daily caloric burn."
      onBack={onBack} ctaLabel="Next" ctaDisabled={!state.activityLevel}
      onCta={async () => { await savePartial({ activityLevel: state.activityLevel }); onNext(); }}>
      <View style={{ gap: 16 }}>
        {OPTIONS.map(({ key, title, subtitle, Icon }) => (
          <OptionCard key={key} title={title} subtitle={subtitle} selected={state.activityLevel === key}
            onPress={() => update({ activityLevel: key })} icon={<Icon size={34} color="#000" />} testID={`activity-${key}`} />
        ))}
      </View>
    </AuthScaffold>
  );
}
