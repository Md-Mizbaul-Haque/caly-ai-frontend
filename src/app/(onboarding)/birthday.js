import { useRouter } from 'expo-router';
import BirthdayScreen from '../../features/onboarding/screens/BirthdayScreen';
import { nextPath } from '../../features/onboarding/steps';

export default function BirthdayRoute() {
  const router = useRouter();
  return (
    <BirthdayScreen
      onBack={() => router.back()}
      onNext={() => router.push(nextPath('birthday'))}
    />
  );
}
