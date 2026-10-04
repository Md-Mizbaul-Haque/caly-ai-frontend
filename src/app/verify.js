import { useRouter } from 'expo-router';
import VerifyScreen from '../features/auth/screens/VerifyScreen';
import { useSession } from '../features/auth/session';

export default function VerifyRoute() {
  const router = useRouter();
  const { stageEmail, verifyNext, authBusy, handleVerify, handleResend, handleSkip } = useSession();
  return (
    <VerifyScreen
      email={stageEmail}
      onBack={() => router.replace(verifyNext === 'onboarding' ? '/register' : '/login')}
      onVerify={handleVerify}
      onResend={handleResend}
      onSkip={handleSkip}
      busy={authBusy}
    />
  );
}
