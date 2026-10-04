import { useRouter } from 'expo-router';
import HeightScreen from '../../features/onboarding/screens/HeightScreen';
import { nextPath } from '../../features/onboarding/steps';

export default function HeightRoute() {
  const router = useRouter();
  return (
    <HeightScreen
      onNext={() => router.push(nextPath('height'))}
      onBack={() => router.back()}
    />
  );
}
