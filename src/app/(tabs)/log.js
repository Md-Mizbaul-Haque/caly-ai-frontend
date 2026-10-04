import LogFoodScreen from '../../features/meals/screens/LogFoodScreen';
import { useTabShell } from '../../features/tabs/shell';

export default function LogRoute() {
  const s = useTabShell();
  return (
    <LogFoodScreen
      onSave={s.handleSave}
      photo={s.pendingPhoto}
      onRemovePhoto={() => s.setPendingPhoto(null)}
    />
  );
}
