import { useRouter } from 'expo-router';
import LoginScreen from '../features/auth/screens/LoginScreen';
import { useSession } from '../features/auth/session';
import { useIsOnline } from '../shared/lib/useIsOnline';

export default function LoginRoute() {
  const router = useRouter();
  const { handleLogin, authBusy, stageEmail } = useSession();
  const online = useIsOnline();
  return (
    <LoginScreen
      onBack={() => router.replace('/welcome')}
      onSubmit={handleLogin}
      onForgot={() => router.replace('/forgot')}
      onSwitchRegister={() => router.replace('/register')}
      busy={authBusy}
      online={online}
      prefillEmail={stageEmail}
    />
  );
}
