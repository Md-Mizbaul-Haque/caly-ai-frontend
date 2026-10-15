import { router } from 'expo-router';
import ProgressScreen from '../../features/progress/screens/ProgressScreen';
import { useTabShell } from '../../features/tabs/shell';

export default function HistoryRoute() {
  const s = useTabShell();
  return (
    <ProgressScreen
      bottomOffset={s.navHeight}
      weights={s.weights}
      weightGoal={s.weightGoal}
      meals={s.meals}
      rangeMeals={s.rangeMeals}
      loading={s.loading}
      error={s.error}
      timeZone={s.timeZone}
      user={s.user}
      onLogWeight={() => s.setLogWeightOpen(true)}
      onEditGoal={() => router.push('/weight-tracker')}
      onRetry={() => Promise.allSettled([s.loadWeek(), s.refreshWeights(), s.loadRangeMeals(365)])}
      onRefreshWeights={s.refreshWeights}
      refreshWeightsIfStale={s.refreshWeightsIfStale}
      onLoadRangeMeals={s.loadRangeMeals}
      onLoadWeek={s.loadWeek}
      onDeleteWeight={s.handleDeleteWeight}
    />
  );
}
