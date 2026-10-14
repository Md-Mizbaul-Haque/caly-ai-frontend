import { useRouter } from 'expo-router';
import NutritionPlanScreen from '../../features/onboarding/screens/NutritionPlanScreen';
import { nextPath } from '../../features/onboarding/steps';

export default function NutritionPlanRoute() {
  const router = useRouter();
  return (
    <NutritionPlanScreen
      onNext={() => router.push(nextPath('nutritionPlan'))}
    />
  );
}
