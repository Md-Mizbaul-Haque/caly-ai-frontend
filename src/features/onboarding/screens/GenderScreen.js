import { memo, useCallback, useState } from 'react';
import { View } from 'react-native';
import { Circle, CircleUser, User, UserRound } from '../../../shared/components/ui/icons';
import AuthScaffold from '../../../shared/components/auth/AuthScaffold';
import OptionCard from '../../../shared/components/auth/OptionCard';
import { useOnboarding } from '../OnboardingContext';
import { INK, PRIMARY } from '../../../shared/theme/colors';

const OPTIONS = [
  { key: 'male', title: 'Male', Icon: User },
  { key: 'female', title: 'Female', Icon: UserRound },
  { key: 'nonbinary', title: 'Non-binary', Icon: Circle },
];

function GenderScreen({ onNext }) {
  const { state, update, savePartial } = useOnboarding();
  const [busy, setBusy] = useState(false);
  // Persist immediately like the other steps: gender used to live only in
  // memory until the final PUT, so any pre-finish exit silently lost it.
  const goNext = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const ok = await savePartial({ gender: state.gender });
      if (ok) onNext();
    } finally {
      setBusy(false);
    }
  }, [busy, savePartial, state.gender, onNext]);
  return (
    <AuthScaffold
      title="What is your gender?"
      subtitle="This helps us create your personalized health plan."
      ctaLabel={busy ? 'Saving…' : 'Continue'}
      ctaDisabled={!state.gender || busy}
      onCta={goNext}
    >
      <View className="flex-row items-stretch" style={{ gap: 12 }}>
        {OPTIONS.map(({ key, title, Icon }) => {
          const selected = state.gender === key;
          return (
            <View key={key} className="flex-1">
              <OptionCard layout="vertical" title={title} selected={selected} onPress={() => update({ gender: key })}
                icon={<Icon size={26} color={selected ? PRIMARY : INK} />} testID={`gender-${key}`} />
            </View>
          );
        })}
      </View>
      <View className="mt-4">
        <OptionCard title="Prefer Not To Say" selected={state.gender === 'prefer_not_to_say'}
          onPress={() => update({ gender: 'prefer_not_to_say' })}
          icon={<CircleUser size={22} color={state.gender === 'prefer_not_to_say' ? PRIMARY : INK} />} testID="gender-prefer" />
      </View>
    </AuthScaffold>
  );
}

export default memo(GenderScreen);
