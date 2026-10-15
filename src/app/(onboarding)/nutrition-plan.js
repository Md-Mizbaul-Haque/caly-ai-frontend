import { useRouter } from 'expo-router';
import NutritionPlanScreen from '../../features/onboarding/screens/NutritionPlanScreen';
import { useSession } from '../../features/auth/session';

export default function NutritionPlanRoute() {
  const router = useRouter();
  const { refreshUser } = useSession();
  return (
    <NutritionPlanScreen
      onNext={async () => {
        try {
          await refreshUser();
        } finally {
          router.replace('/(tabs)/dashboard');
        }
      }}
    />
  );
}
