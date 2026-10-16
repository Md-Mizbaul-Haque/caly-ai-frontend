import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import WelcomeScreen from '../features/auth/screens/WelcomeScreen';

export default function WelcomeRoute() {
  const router = useRouter();
  const onLogin = useCallback(() => router.replace('/login'), [router]);
  const onRegister = useCallback(() => router.replace('/register'), [router]);
  return (
    <WelcomeScreen
      onLogin={onLogin}
      onRegister={onRegister}
    />
  );
}
