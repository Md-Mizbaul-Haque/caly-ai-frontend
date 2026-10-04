import ProfileScreen from '../../features/progress/screens/ProfileScreen';
import { useTabShell } from '../../features/tabs/shell';

export default function ProfileRoute() {
  const s = useTabShell();
  return <ProfileScreen goal={s.goal} setGoal={s.setGoal} />;
}
