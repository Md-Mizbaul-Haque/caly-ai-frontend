import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import RegisterScreen from '../features/auth/screens/RegisterScreen';
import { useSession } from '../features/auth/session';
import { useIsOnline } from '../shared/lib/useIsOnline';

export default function RegisterRoute() {
  const router = useRouter();
  const { handleRegister, authBusy, stageEmail } = useSession();
  const online = useIsOnline();
  const onSwitchLogin = useCallback(() => router.replace('/login'), [router]);
  // Auth entries replace (no stack to pop) — back goes to welcome explicitly.
  const onBack = useCallback(() => router.replace('/welcome'), [router]);
  return (
    <RegisterScreen
      onBack={onBack}
      onSubmit={handleRegister}
      onSwitchLogin={onSwitchLogin}
      busy={authBusy}
      online={online}
      prefillEmail={stageEmail}
    />
  );
}
