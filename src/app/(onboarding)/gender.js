import { useRouter } from 'expo-router';
import GenderScreen from '../../features/onboarding/screens/GenderScreen';
import { nextPath } from '../../features/onboarding/steps';
import { useSession } from '../../features/auth/session';

export default function GenderRoute() {
  const router = useRouter();
  const { user, handleLogout } = useSession();
  // Back from the FIRST onboarding step: a pending registrant (no session
  // yet) just returns to welcome. A signed-in account must sign out first —
  // otherwise the route guard (authed + !onboardingCompleted) bounces
  // /welcome straight back here, which made this button look dead. Per-step
  // progress is server-saved, so signing out loses nothing.
  const onBack = () => {
    if (!user) { router.replace('/welcome'); return; }
    handleLogout().finally(() => router.replace('/welcome'));
  };
  return (
    <GenderScreen
      onBack={onBack}
      onNext={() => router.push(nextPath('gender'))}
    />
  );
}
