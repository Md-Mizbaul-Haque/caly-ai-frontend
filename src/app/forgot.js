import { useRouter } from 'expo-router';
import ForgotScreen from '../features/auth/screens/ForgotScreen';
import { useSession } from '../features/auth/session';

export default function ForgotRoute() {
  const router = useRouter();
  const { setStageEmail } = useSession();
  return (
    <ForgotScreen
      onBack={() => router.replace('/login')}
      onDone={(em) => { setStageEmail(em); router.replace('/login'); }}
    />
  );
}
