import { useRouter } from 'expo-router';
import GenderScreen from '../../features/onboarding/screens/GenderScreen';
import { useSession } from '../../features/auth/session';
import { nextPath } from '../../features/onboarding/steps';

export default function GenderRoute() {
  const router = useRouter();
  const { handleLogout } = useSession();
  return (
    <GenderScreen
      onNext={() => router.push(nextPath('gender'))}
      onBack={async () => { await handleLogout(); router.replace('/welcome'); }}
    />
  );
}
