import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import VerifyScreen from '../features/auth/screens/VerifyScreen';
import { useSession } from '../features/auth/session';

export default function VerifyRoute() {
  const router = useRouter();
  const { stageEmail, authBusy, handleVerify, handleResend, handleSkip } = useSession();
  // Reached via replace (register/login) with the email staged — back lands
  // on login, which prefills that same staged email.
  const onBack = useCallback(() => router.replace('/login'), [router]);
  return (
    <VerifyScreen
      onBack={onBack}
      email={stageEmail}
      onVerify={handleVerify}
      onResend={handleResend}
      onSkip={handleSkip}
      busy={authBusy}
    />
  );
}
