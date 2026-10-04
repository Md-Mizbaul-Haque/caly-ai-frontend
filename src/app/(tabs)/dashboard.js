import DashboardScreen from '../../features/dashboard/screens/DashboardScreen';
import { useTabShell } from '../../features/tabs/shell';

export default function DashboardRoute() {
  const s = useTabShell();
  return (
    <DashboardScreen
      meals={s.meals}
      goal={s.goal}
      loading={s.loading}
      error={s.error}
      onRetry={s.loadWeek}
      onAdd={() => s.setSheetOpen(true)}
      onDelete={s.deleteMeal}
    />
  );
}
