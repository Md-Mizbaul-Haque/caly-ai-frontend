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
      onLogWeight={() => s.setLogWeightOpen(true)}
      onRetry={s.loadWeek}
      onRefreshWeights={s.refreshWeights}
      onLoadRangeMeals={s.loadRangeMeals}
      onDeleteWeight={s.handleDeleteWeight}
    />
  );
}
