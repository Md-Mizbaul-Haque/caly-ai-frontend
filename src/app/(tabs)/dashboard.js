import DashboardScreen from '../../features/dashboard/screens/DashboardScreen';
import { useTabShell } from '../../features/tabs/shell';

export default function DashboardRoute() {
  const s = useTabShell();
  return (
    <DashboardScreen
      meals={s.progressCache?.meals ?? s.meals ?? []}
      goal={s.goal ?? null}
      loading={s.loading ?? false}
      error={s.error ?? null}
      weightGoal={s.progressCache?.weightGoal ?? s.weightGoal ?? null}
      timeZone={s.timeZone}
      // Wrap: Pressable passes its event as the first arg, which loadWeek
      // would destructure as {silent, reference} — always refresh the
      // selected week non-silently instead.
      onRetry={() => s.loadWeek({ reference: s.selectedDate })}
      onAdd={() => s.setSheetOpen(true)}
      onDelete={s.deleteMeal}
    />
  );
}
