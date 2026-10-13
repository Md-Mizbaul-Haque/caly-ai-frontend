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
    if (!authChecked || !pathname || pathname === '/') return;
    const group = segments[0];
    const inTabs = group === '(tabs)';
    const inOnboarding = group === '(onboarding)';
    const authed = !!user;
    const completed = !!user?.onboardingCompleted;
    const onboardingActive = !!stageEmail || (authed && !completed);
    if (!authed && (inTabs || (inOnboarding && !onboardingActive))) {
      router.replace('/welcome');
    } else if (authed && completed && !inTabs && !inOnboarding) {
      // Allow specific routes when authenticated and completed, outside of tabs and onboarding
      const allowedRoutes = [
        '/profile',
        '/settings',
        '/weight-tracker',
        '/notifications',
        '/referral-code',
        '/whats-new',
        '/snappy-early-access',
        '/help',
        '/upgrade-membership',
        '/calorie-macro-targets',
        '/favorites',
        '/find-recipes',
        '/day-strip-lab', // dev-only strip playground (itself __DEV__-gated)
      ];
      if (!allowedRoutes.includes(pathname)) {
        router.replace('/(tabs)/dashboard');
      }
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
          {/* Unauthenticated stack (welcome/login/register/forgot/verify) lives
              at the root, OUTSIDE the main (tabs) navigator, so the tab bar
              (BottomNav, rendered only by (tabs)/_layout) can never cover
              auth CTAs. tabBarStyle display none is set defensively on each
              auth route. */}
          <Stack screenOptions={{ headerShown: false, animation: 'none' }}>
            <Stack.Screen name="index" />
            <Stack.Screen
              name="welcome"
              options={{ tabBarStyle: { display: 'none' } as any }}
            />
            <Stack.Screen
              name="login"
              options={{ tabBarStyle: { display: 'none' } as any }}
            />
            <Stack.Screen
              name="register"
              options={{ tabBarStyle: { display: 'none' } as any }}
            />
            <Stack.Screen
              name="forgot"
              options={{ tabBarStyle: { display: 'none' } as any }}
            />
            <Stack.Screen
              name="verify"
              options={{ tabBarStyle: { display: 'none' } as any }}
            />
            <Stack.Screen name="(onboarding)" />
            <Stack.Screen name="(tabs)" />
          </Stack>
          <RouteGuard />
          <ThemedToast />
          <PortalHost />
        </SafeAreaView>
      </AuthSessionProvider>
    </SafeAreaProvider>
  );
}
