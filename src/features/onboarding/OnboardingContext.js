import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { apiGet, apiPut } from '../../shared/lib/api';
import { toastError } from '../../shared/utils/toast';
import { ftInToCm, lbToKg } from '../../shared/utils/nutrition';
import { applyHydration } from './applyHydration';

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
  // Keys the user touched while the hydration GET may still be in flight.
  // Hydration must never stomp a just-tapped answer with stale server data.
  const dirtyRef = useRef(new Set());
  const markDirty = useCallback((patch) => {
    Object.keys(patch || {}).forEach((k) => dirtyRef.current.add(k));
  }, []);
  const update = useCallback((patch) => {
    markDirty(patch);
    setState((s) => ({ ...s, ...patch }));
  }, [markDirty]);
  // Hydrate local defaults from the server's partial saves so the final plan
  // is computed from THIS user's real inputs — never stale local defaults
  // (a "wrong plan for this user" bug after backgrounding/deep-linking).
  // Dirty keys (tapped during the flight) always win over the response.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { user } = await apiGet('/api/auth/me');
        if (!alive || !user) return;
        const dirty = new Set(dirtyRef.current);
        setState((s) => applyHydration(s, user, dirty));
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
    // Mark dirty first: on failure local is ahead of the server and a late
    // hydration must not clobber it; on success the values match anyway.
    markDirty(patch);
    setState((s) => ({ ...s, ...patch }));
    try {
      await apiPut('/api/auth/profile', patch);
      return true;
    } catch (e) {
      toastError('Could not save', e.message);
      return false;
    }
  }, [markDirty]);
  return <OnboardingContext.Provider value={{ state, update, savePartial }}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used inside OnboardingProvider');
  return ctx;
}
