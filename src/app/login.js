import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import LoginScreen from '../features/auth/screens/LoginScreen';
import { useSession } from '../features/auth/session';
import { useIsOnline } from '../shared/lib/useIsOnline';

export default function LoginRoute() {
  const router = useRouter();
  const { handleLogin, authBusy, stageEmail } = useSession();
  const online = useIsOnline();
  const onForgot = useCallback(() => router.replace('/forgot'), [router]);
  const onSwitchRegister = useCallback(() => router.replace('/register'), [router]);
  // Auth entries replace (no stack to pop) — back goes to welcome explicitly.
  const onBack = useCallback(() => router.replace('/welcome'), [router]);
  return (
    <LoginScreen
      onBack={onBack}
      onSubmit={handleLogin}
      onForgot={onForgot}
      onSwitchRegister={onSwitchRegister}
      busy={authBusy}
      online={online}
      prefillEmail={stageEmail}
    />
  );
}
