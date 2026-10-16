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
  return (
    <LoginScreen
      onSubmit={handleLogin}
      onForgot={onForgot}
      onSwitchRegister={onSwitchRegister}
      busy={authBusy}
      online={online}
      prefillEmail={stageEmail}
    />
  );
}
