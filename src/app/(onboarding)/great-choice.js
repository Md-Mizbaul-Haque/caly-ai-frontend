import { useRouter } from 'expo-router';
import GreatChoiceScreen from '../../features/onboarding/screens/GreatChoiceScreen';
import { nextPath } from '../../features/onboarding/steps';

export default function GreatChoiceRoute() {
  const router = useRouter();
  return (
    <GreatChoiceScreen
      onNext={() => router.push(nextPath('greatChoice'))}
      onBack={() => router.back()}
    />
  );
}
