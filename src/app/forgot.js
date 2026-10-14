import { useRouter } from 'expo-router';
import ForgotScreen from '../features/auth/screens/ForgotScreen';
import { useSession } from '../features/auth/session';

export default function ForgotRoute() {
  const router = useRouter();
  const { setStageEmail } = useSession();
  return (
    <ForgotScreen
      onDone={(em) => { setStageEmail(em); router.replace('/login'); }}
    />
  );
}
