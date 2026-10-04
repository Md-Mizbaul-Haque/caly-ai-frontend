import { Slot, usePathname } from 'expo-router';
import { OnboardingProvider } from '../../features/onboarding/OnboardingContext';
import FadeStep from '../../features/onboarding/FadeStep';
import { useSession } from '../../features/auth/session';

export default function OnboardingLayout() {
  const pathname = usePathname();
  const { stageEmail, user } = useSession();
  return (
    <OnboardingProvider email={stageEmail || user?.email || ''}>
      <FadeStep stepKey={pathname}>
        <Slot />
      </FadeStep>
    </OnboardingProvider>
  );
}
