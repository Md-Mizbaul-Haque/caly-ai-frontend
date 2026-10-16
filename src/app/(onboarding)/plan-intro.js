import { useRouter } from 'expo-router';
import PlanIntroScreen from '../../features/onboarding/screens/PlanIntroScreen';
import { nextPath } from '../../features/onboarding/steps';

export default function PlanIntroRoute() {
  const router = useRouter();
  return (
    <PlanIntroScreen
      onBack={() => router.back()}
      onNext={() => router.push(nextPath('planIntro'))}
    />
  );
}
