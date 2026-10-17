import MealsScreen from '../../features/meals/screens/MealsScreen';
import { useTabShell } from '../../features/tabs/shell';

export default function MealsRoute() {
  const s = useTabShell();
  return (
    <MealsScreen
      meals={s.meals || []}
      loading={s.loading}
      onSave={s.handleSave}
      onOpenScan={(mode) => s.openScan(mode)}
    />
  );
}
