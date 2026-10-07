import { View } from 'react-native';
import { Circle, CircleUser, User, UserRound } from '../../../shared/components/ui/icons';
import AuthScaffold from '../../../shared/components/auth/AuthScaffold';
import OptionCard from '../../../shared/components/auth/OptionCard';
import { useOnboarding } from '../OnboardingContext';

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
      <View className="flex-row items-stretch" style={{ gap: 12 }}>
        {OPTIONS.map(({ key, title, Icon }) => {
          const selected = state.gender === key;
          return (
            <View key={key} className="flex-1">
              <OptionCard layout="vertical" title={title} selected={selected} onPress={() => update({ gender: key })}
                icon={<Icon size={26} color={selected ? '#f2470c' : '#1A1A1A'} />} testID={`gender-${key}`} />
            </View>
          );
        })}
      </View>
      <View className="mt-4">
        <OptionCard title="Prefer Not To Say" selected={state.gender === 'prefer_not_to_say'}
          onPress={() => update({ gender: 'prefer_not_to_say' })}
          icon={<CircleUser size={22} color={state.gender === 'prefer_not_to_say' ? '#f2470c' : '#1A1A1A'} />} testID="gender-prefer" />
      </View>
    </AuthScaffold>
  );
}
