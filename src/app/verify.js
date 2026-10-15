import VerifyScreen from '../features/auth/screens/VerifyScreen';
import { useSession } from '../features/auth/session';

export default function VerifyRoute() {
  const { stageEmail, authBusy, handleVerify, handleResend, handleSkip } = useSession();
  return (
    <VerifyScreen
      email={stageEmail}
      onVerify={handleVerify}
      onResend={handleResend}
      onSkip={handleSkip}
      busy={authBusy}
    />
  );
}
