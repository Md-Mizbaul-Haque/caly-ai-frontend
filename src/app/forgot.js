import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import ForgotScreen from '../features/auth/screens/ForgotScreen';
import { useSession } from '../features/auth/session';

export default function ForgotRoute() {
  const router = useRouter();
  const { setStageEmail } = useSession();
  const onDone = useCallback((em) => { setStageEmail(em); router.replace('/login'); }, [router, setStageEmail]);
  return (
    <ForgotScreen
      onDone={onDone}
    />
  );
}
