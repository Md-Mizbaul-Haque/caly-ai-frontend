import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import ForgotScreen from '../features/auth/screens/ForgotScreen';
import { useSession } from '../features/auth/session';

export default function ForgotRoute() {
  const router = useRouter();
  const { setStageEmail } = useSession();
  const onDone = useCallback((em) => { setStageEmail(em); router.replace('/login'); }, [router, setStageEmail]);
  // Entered via replace from login — back returns there explicitly.
  const onBack = useCallback(() => router.replace('/login'), [router]);
  return (
    <ForgotScreen
      onBack={onBack}
      onDone={onDone}
    />
  );
}
