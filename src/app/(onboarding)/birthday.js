import { useRouter } from 'expo-router';
import BirthdayScreen from '../../features/onboarding/screens/BirthdayScreen';
import { nextPath } from '../../features/onboarding/steps';

export default function BirthdayRoute() {
  const router = useRouter();
  return (
    <BirthdayScreen
      onNext={() => router.push(nextPath('birthday'))}
      onBack={() => router.back()}
    />
  );
}
