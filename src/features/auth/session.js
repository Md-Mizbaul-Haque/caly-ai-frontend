import { createContext, useContext, useEffect, useState } from 'react';
import { router } from 'expo-router';
import { getToken, setSessionExpiredHandler } from '../../shared/lib/tokenStore';
import { fetchMe, login, logout, register, resendCode, skipVerification, verifyEmail, updateProfile } from '../../shared/lib/authApi';
import { toastError, toastSuccess } from '../../shared/utils/toast';
import { readCache, writeCache, clearAppCache } from '../../shared/lib/appCache';
import { deviceTimeZone } from '../../shared/utils/format';

const AuthSessionContext = createContext(null);

// One zone sync per account at a time (module scope — survives rerenders).
// The PUT response re-enters applyUser with the same zone and no-ops.
let syncingZoneFor = null;
function syncTimeZone(u, setUser) {
  if (!u) return;
  const key = u._id || u.id || u.email;
  if (!key || syncingZoneFor === key) return;
  let device;
  try {
    device = deviceTimeZone();
  } catch {
    return;
  }
  if (!device || u.timezone === device) return;
  syncingZoneFor = key;
  updateProfile({ timezone: device })
    .then(({ user: fresh }) => {
      if (fresh) setUser(fresh);
    })
    .catch(() => {})
    .finally(() => {
      if (syncingZoneFor === key) syncingZoneFor = null;
    });
}

// Bootstraps must never hang the splash: SecureStore/AsyncStorage can stall
// (or throw) on some Android devices, which left authChecked false forever.
const BOOT_TIMEOUT_MS = 8000;

function withBootTimeout(promise, ms = 5000) {
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve(null), ms);
  });
  return Promise.race([
    Promise.resolve(promise).finally(() => clearTimeout(timer)),
    timeout,
  ]);
}

export function AuthSessionProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [goal, setGoal] = useState(null);
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
    if (u) writeCache('user', u);
    // Nullable: a missing/invalid goal stays null so Home renders "set your
    // goal" instead of a phantom 2000 (backend defaults 2000, so null only
    // shows pre-hydration or for accounts without a saved goal).
    if (u && Number.isFinite(Number(u.dailyGoalKcal)) && Number(u.dailyGoalKcal) > 0) {
      setGoal(Number(u.dailyGoalKcal));
    } else if (u) {
      setGoal(null);
    }
    syncTimeZone(u, setUser);
  }

  useEffect(() => {
    setSessionExpiredHandler(() => {
      setUser(null);
      setGoal(null);
      setStageEmail('');
      clearAppCache();
    });
  }, []);

  useEffect(() => {
    let alive = true;
    // Failsafe: even if storage or the network never settles, the splash
    // must go away so the user reaches a usable screen instead of hanging.
    const failsafe = setTimeout(() => {
      if (alive) setAuthChecked(true);
    }, BOOT_TIMEOUT_MS);
    // Cache-first startup: a returning user sees their data instantly while
    // the token is revalidated in the background. Only a real 401 (revoked
    // session) signs them out; network blips must not.
    (async () => {
      try {
        const cached = await withBootTimeout(readCache('user'));
        if (!alive) return;
        if (cached) {
          applyUser(cached);
          setAuthChecked(true);
        }
        const t = await withBootTimeout(getToken());
        if (!t) { if (alive) { setUser(null); setAuthChecked(true); } return; }
        try {
          const data = await fetchMe();
          if (alive) applyUser(data.user);
        } catch (e) {
          if (!alive) return;
          if (e?.status === 401) { setUser(null); setGoal(null); clearAppCache(); }
          // Offline/other errors: keep whatever we have (cached or null).
        }
      } catch {
        // Storage threw: fall through — finally still releases the splash.
      } finally {
        if (alive) setAuthChecked(true);
        clearTimeout(failsafe);
      }
    })();
    return () => { alive = false; clearTimeout(failsafe); };
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
      setGoal(null);
      setStageEmail('');
      clearAppCache();
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
