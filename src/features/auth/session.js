import { createContext, useContext, useEffect, useState } from 'react';
import { router } from 'expo-router';
import { getToken, setSessionExpiredHandler } from '../../shared/lib/tokenStore';
import { fetchMe, login, logout, register, resendCode, skipVerification, verifyEmail } from '../../shared/lib/authApi';
import { toastError, toastSuccess } from '../../shared/utils/toast';

const AuthSessionContext = createContext(null);

export function AuthSessionProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [goal, setGoal] = useState(2000);
  const [stageEmail, setStageEmail] = useState('');
  const [verifyNext, setVerifyNext] = useState('app');
  const [authBusy, setAuthBusy] = useState(false);

  // True when the account exists but onboarding was never finished.
  // Callers show a "finish setup" toast; route guards own the redirect.
  function needsOnboarding(u) {
    return !!u && !u.onboardingCompleted;
  }

  function applyUser(u) {
    setUser(u);
    if (u && u.dailyGoalKcal) setGoal(u.dailyGoalKcal);
  }

  useEffect(() => {
    setSessionExpiredHandler(() => {
      setUser(null);
      setStageEmail('');
    });
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const t = await getToken();
      if (!t) { if (alive) setAuthChecked(true); return; }
      try {
        const data = await fetchMe();
        if (alive) applyUser(data.user);
      } catch { if (alive) setUser(null); }
      finally { if (alive) setAuthChecked(true); }
    })();
    return () => { alive = false; };
  }, []);

  async function handleLogin(email, password) {
    setAuthBusy(true);
    try {
      const data = await login(email, password);
      applyUser(data.user);
      if (needsOnboarding(data.user)) {
        toastSuccess('Welcome back', "Let's finish setting up your plan");
      } else {
        toastSuccess('Welcome', 'Signed in');
      }
    } catch (e) {
      if (e.needsVerification) {
        setStageEmail(email);
        setVerifyNext('app');
        router.replace('/verify');
        toastSuccess('Check email', 'Verify your email to continue');
      } else {
        toastError('Login failed', e.message);
      }
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleRegister(name, email, password) {
    setAuthBusy(true);
    try {
      await register(name, email, password);
      setStageEmail(email);
      setVerifyNext('onboarding');
      router.replace('/verify');
      toastSuccess('Check email', 'Enter the verification code');
    } catch (e) {
      toastError('Registration failed', e.message);
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleVerify(email, code) {
    setAuthBusy(true);
    try {
      const data = await verifyEmail(email, code);
      if (verifyNext === 'onboarding') {
        setStageEmail(data.user.email);
      }
      applyUser(data.user);
      if (needsOnboarding(data.user)) {
        toastSuccess('Verified', "Let's finish setting up your plan");
      } else {
        toastSuccess('Welcome', 'Verified');
      }
    } catch (e) {
      toastError('Verification failed', e.message);
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleResend(email) {
    try {
      await resendCode(email);
      toastSuccess('Code resent', 'Check your email');
    } catch (e) {
      toastError('Could not resend', e.message);
    }
  }

  async function handleSkip(email) {
    setAuthBusy(true);
    try {
      const data = await skipVerification(email);
      if (verifyNext === 'onboarding') {
        setStageEmail(data.user.email);
      }
      applyUser(data.user);
      if (needsOnboarding(data.user)) {
        toastSuccess('Welcome back', "Let's finish setting up your plan");
      } else {
        toastSuccess('Welcome', 'Signed in');
      }
    } catch (e) {
      toastError('Could not skip', e.message);
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleLogout() {
    try {
      await logout();
    } finally {
      setUser(null);
      setStageEmail('');
    }
  }

  async function refreshUser() {
    const { user: u } = await fetchMe();
    applyUser(u);
    return u;
  }

  const value = {
    user,
    setUser,
    authChecked,
    goal,
    setGoal,
    stageEmail,
    setStageEmail,
    verifyNext,
    authBusy,
    needsOnboarding,
    handleLogin,
    handleRegister,
    handleVerify,
    handleResend,
    handleSkip,
    handleLogout,
    refreshUser,
  };
  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(AuthSessionContext);
  if (!ctx) throw new Error('useSession must be used inside AuthSessionProvider');
  return ctx;
}
