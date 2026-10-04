import ProgressScreen from '../../features/progress/screens/ProgressScreen';
import { useTabShell } from '../../features/tabs/shell';

export default function HistoryRoute() {
  const s = useTabShell();
  return (
    <ProgressScreen
      weights={s.weights}
      weightGoal={s.weightGoal}
      onLogWeight={() => s.setLogWeightOpen(true)}
      onRetry={s.loadWeek}
      onDeleteWeight={s.handleDeleteWeight}
    />
  );
}
