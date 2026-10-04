import { useRouter } from 'expo-router';
import PaywallScreen from '../../features/onboarding/screens/PaywallScreen';
import { useSession } from '../../features/auth/session';

export default function PaywallRoute() {
  const router = useRouter();
  const { refreshUser } = useSession();
  async function done() {
    try {
      await refreshUser();
    } finally {
      router.replace('/(tabs)/dashboard');
    }
  }
  return <PaywallScreen onDone={done} />;
}
