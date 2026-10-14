import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect } from 'expo-router';
import { useSession } from '../features/auth/session';
import { OnboardingProvider } from '../features/onboarding/OnboardingContext';
import GenderScreen from '../features/onboarding/screens/GenderScreen';
import ThemedToast from '../shared/components/ui/ThemedToast';
import AppSplash from '../shared/components/AppSplash';

// DEV ONLY preview — false = normal auth flow (unauthorized → welcome).
const DEV_PREVIEW = false;

export default function Index() {
  const { authChecked, user } = useSession();
  if (DEV_PREVIEW) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-white">
        <OnboardingProvider email="dev@preview.local">
          <GenderScreen onNext={() => {}} />
        </OnboardingProvider>
        <ThemedToast />
      </SafeAreaView>
    );
  }
  // Never render nothing — a silent blank screen is indistinguishable
  // from a dead bundle. The branded splash matches SplashOverlay so the
  // native splash → here → tabs feels like one continuous screen.
  if (!authChecked) return <AppSplash />;
  if (!user) return <Redirect href="/welcome" />;
  if (!user.onboardingCompleted) return <Redirect href="/(onboarding)/gender" />;
  return <Redirect href="/(tabs)/dashboard" />;
}
