import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiGet, apiPut } from '../../shared/lib/api';
import { toastError } from '../../shared/utils/toast';
import { ftInToCm, lbToKg, normalizeBirthDate } from '../../shared/utils/nutrition';

export function initialOnboarding(email) {
  return {
    email: email || '',
    gender: null,
    birthDate: new Date(2008, 8, 29),
    weightKg: lbToKg(154),
    weightUnit: 'lb',
    activityLevel: null,
    targetWeightKg: 70,
    targetUnit: 'lb',
    heightCm: ftInToCm(5, 8),
    heightUnit: 'ft/in',
  };
}

const OnboardingContext = createContext(null);

export function OnboardingProvider({ email, children }) {
  const [state, setState] = useState(() => initialOnboarding(email));
  const update = useCallback((patch) => setState((s) => ({ ...s, ...patch })), []);
  // Hydrate local defaults from the server's partial saves so the final plan
  // is computed from THIS user's real inputs — never stale local defaults
  // (a "wrong plan for this user" bug after backgrounding/deep-linking).
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { user } = await apiGet('/api/auth/me');
        if (!alive || !user) return;
        setState((s) => {
          const next = { ...s };
          if (user.gender) next.gender = user.gender;
          if (user.birthDate) {
            const d = normalizeBirthDate(user.birthDate);
            if (d) next.birthDate = d;
          }
          if (typeof user.heightCm === 'number') next.heightCm = user.heightCm;
          if (typeof user.weightKg === 'number') next.weightKg = user.weightKg;
          if (typeof user.targetWeightKg === 'number') next.targetWeightKg = user.targetWeightKg;
          if (user.activityLevel) next.activityLevel = user.activityLevel;
          return next;
        });
      } catch {
        // Offline / unauthed here is fine — local flow continues, final save
        // re-validates completeness server-side.
      }
    })();
    return () => { alive = false; };
  }, []);
  // Returns true on server ack, false on failure. Callers must ONLY advance
  // when true — advancing on failure desyncs client/server and produces a
  // wrong or unsavable final plan.
  const savePartial = useCallback(async (patch) => {
    setState((s) => ({ ...s, ...patch }));
    try {
      await apiPut('/api/auth/profile', patch);
      return true;
    } catch (e) {
      toastError('Could not save', e.message);
      return false;
    }
  }, []);
  return <OnboardingContext.Provider value={{ state, update, savePartial }}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used inside OnboardingProvider');
  return ctx;
}
