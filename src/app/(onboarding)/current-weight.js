import { useRouter } from 'expo-router';
import CurrentWeightScreen from '../../features/onboarding/screens/CurrentWeightScreen';
import { nextPath } from '../../features/onboarding/steps';

export default function CurrentWeightRoute() {
  const router = useRouter();
  return (
    <CurrentWeightScreen
      onBack={() => router.back()}
      onNext={() => router.push(nextPath('currentWeight'))}
    />
  );
}
