import { useRouter } from 'expo-router';
import GenderScreen from '../../features/onboarding/screens/GenderScreen';
import { nextPath } from '../../features/onboarding/steps';

export default function GenderRoute() {
  const router = useRouter();
  return (
    <GenderScreen
      onBack={() => router.replace('/welcome')}
      onNext={() => router.push(nextPath('gender'))}
    />
  );
}
