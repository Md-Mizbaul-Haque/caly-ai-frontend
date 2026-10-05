import { ActivityIndicator, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect } from 'expo-router';
import { useSession } from '../features/auth/session';
import { OnboardingProvider } from '../features/onboarding/OnboardingContext';
import GenderScreen from '../features/onboarding/screens/GenderScreen';
import ThemedToast from '../shared/components/ui/ThemedToast';

// DEV ONLY preview — false = normal auth flow (unauthorized → welcome).
const DEV_PREVIEW = false;

export default function Index() {
  const { authChecked, user } = useSession();
  if (DEV_PREVIEW) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-white">
        <OnboardingProvider email="dev@preview.local">
          <GenderScreen onNext={() => {}} onBack={() => {}} />
        </OnboardingProvider>
        <ThemedToast />
      </SafeAreaView>
    );
  }
  // Never render nothing — a silent blank screen is indistinguishable
  // from a dead bundle. If this spinner persists, the auth check or the
  // bundle load is stuck; check the Metro terminal for errors.
  if (!authChecked) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#f2470c" />
        <Text className="mt-4 text-[16px] text-black/60">Loading Caly AI…</Text>
      </SafeAreaView>
    );
  }
  if (!user) return <Redirect href="/welcome" />;
  if (!user.onboardingCompleted) return <Redirect href="/(onboarding)/gender" />;
  return <Redirect href="/(tabs)/dashboard" />;
}
