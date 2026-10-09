import DashboardScreen from '../../features/dashboard/screens/DashboardScreen';
import { useTabShell } from '../../features/tabs/shell';

export default function DashboardRoute() {
  const s = useTabShell();
  return (
    <DashboardScreen
      meals={s.progressCache?.meals ?? s.meals ?? []}
      goal={s.goal ?? 2000}
      loading={s.loading ?? false}
      error={s.error ?? null}
      weightGoal={s.progressCache?.weightGoal ?? s.weightGoal ?? null}
      timeZone={s.timeZone}
      onRetry={s.loadWeek}
      onAdd={() => s.setSheetOpen(true)}
      onDelete={s.deleteMeal}
    />
  );
}
