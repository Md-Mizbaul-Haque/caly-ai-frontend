import { useRouter } from 'expo-router';
import ActivityScreen from '../../features/onboarding/screens/ActivityScreen';
import { nextPath } from '../../features/onboarding/steps';

export default function ActivityRoute() {
  const router = useRouter();
  return (
    <ActivityScreen
      onNext={() => router.push(nextPath('activity'))}
      onBack={() => router.back()}
    />
  );
}
