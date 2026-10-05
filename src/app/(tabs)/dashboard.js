import DashboardScreen from '../../features/dashboard/screens/DashboardScreen';
import { useTabShell } from '../../features/tabs/shell';

export default function DashboardRoute() {
  const s = useTabShell();
  return (
    <DashboardScreen
      onRetry={s.loadWeek}
      onAdd={() => s.setSheetOpen(true)}
      onDelete={s.deleteMeal}
    />
  );
}
