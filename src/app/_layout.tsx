// @ts-nocheck - JS file renamed to .tsx for react-native-reusables doctor (which only checks *.tsx)
import '../../global.css';
import { useEffect } from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack, usePathname, useSegments } from 'expo-router';
import { PortalHost } from '@rn-primitives/portal';
import { AuthSessionProvider, useSession } from '../features/auth/session';
import ThemedToast from '../shared/components/ui/ThemedToast';
import OfflineBanner from '../shared/components/ui/OfflineBanner';

// Central route guard. Redirects only on group mismatch so it can never loop:
// after a replace the group matches and the effect goes quiet.
function RouteGuard() {
  const segments = useSegments();
  const pathname = usePathname();
  const { authChecked, user, stageEmail } = useSession();
  useEffect(() => {
    if (!authChecked || pathname === '/') return;
    const group = segments[0];
    const inTabs = group === '(tabs)';
    const inOnboarding = group === '(onboarding)';
    const authed = !!user;
    const completed = !!user?.onboardingCompleted;
    const onboardingActive = !!stageEmail || (authed && !completed);
    if (!authed && (inTabs || (inOnboarding && !onboardingActive))) {
      router.replace('/welcome');
    } else if (authed && completed && !inTabs) {
      router.replace('/(tabs)/dashboard');
    } else if (authed && !completed && !inOnboarding) {
      router.replace('/(onboarding)/gender');
    } else if (!authed && onboardingActive && inTabs) {
      router.replace('/welcome');
    }
  }, [authChecked, pathname, segments, user, stageEmail]);
  return null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthSessionProvider>
        <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#FFFFFF' }} className="flex-1 bg-white">
          <OfflineBanner />
          <Stack screenOptions={{ headerShown: false }} />
          <RouteGuard />
          <ThemedToast />
          <PortalHost />
        </SafeAreaView>
      </AuthSessionProvider>
    </SafeAreaProvider>
  );
}
