import { View } from 'react-native';
import { Circle, CircleUser, User, UserRound } from 'lucide-react-native';
import AuthScaffold from '../../components/auth/AuthScaffold';
import OptionCard from '../../components/auth/OptionCard';
import { useOnboarding } from './OnboardingContext';

const OPTIONS = [
  { key: 'male', title: 'Male', Icon: User },
  { key: 'female', title: 'Female', Icon: UserRound },
  { key: 'nonbinary', title: 'Non-binary', Icon: Circle },
];

export default function GenderScreen({ onNext, onBack }) {
  const { state, update } = useOnboarding();
  return (
    <AuthScaffold
      title="What is your gender?"
      subtitle="This helps us create your personalized health plan."
      onBack={onBack}
      ctaLabel="Continue"
      ctaDisabled={!state.gender}
      onCta={onNext}
    >
      <View className="flex-row" style={{ gap: 12 }}>
        {OPTIONS.map(({ key, title, Icon }) => (
          <View key={key} className="flex-1">
            <OptionCard title={title} selected={state.gender === key} onPress={() => update({ gender: key })}
              icon={<Icon size={30} color="#000" />} testID={`gender-${key}`} />
          </View>
        ))}
      </View>
      <View className="mt-4">
        <OptionCard title="Prefer Not To Say" selected={state.gender === 'prefer_not_to_say'}
          onPress={() => update({ gender: 'prefer_not_to_say' })}
          icon={<CircleUser size={30} color="#000" />} testID="gender-prefer" />
      </View>
    </AuthScaffold>
  );
}
