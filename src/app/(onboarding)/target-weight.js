import { useRouter } from 'expo-router';
import TargetWeightScreen from '../../features/onboarding/screens/TargetWeightScreen';
import { nextPath } from '../../features/onboarding/steps';

export default function TargetWeightRoute() {
  const router = useRouter();
  return (
    <TargetWeightScreen
      onBack={() => router.back()}
      onNext={() => router.push(nextPath('targetWeight'))}
    />
  );
}
