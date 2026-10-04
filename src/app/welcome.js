import { useRouter } from 'expo-router';
import WelcomeScreen from '../features/auth/screens/WelcomeScreen';

export default function WelcomeRoute() {
  const router = useRouter();
  return (
    <WelcomeScreen
      onLogin={() => router.replace('/login')}
      onRegister={() => router.replace('/register')}
    />
  );
}
