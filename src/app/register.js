import { useRouter } from 'expo-router';
import RegisterScreen from '../features/auth/screens/RegisterScreen';
import { useSession } from '../features/auth/session';
import { useIsOnline } from '../shared/lib/useIsOnline';

export default function RegisterRoute() {
  const router = useRouter();
  const { handleRegister, authBusy, stageEmail } = useSession();
  const online = useIsOnline();
  return (
    <RegisterScreen
      onBack={() => router.replace('/welcome')}
      onSubmit={handleRegister}
      onSwitchLogin={() => router.replace('/login')}
      busy={authBusy}
      online={online}
      prefillEmail={stageEmail}
    />
  );
}
