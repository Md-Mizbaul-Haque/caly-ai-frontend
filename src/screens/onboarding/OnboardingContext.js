import { createContext, useCallback, useContext, useState } from 'react';
import { apiPut } from '../../../lib/api';
import { toastError } from '../../utils/toast';
import { ftInToCm, lbToKg } from '../../utils/nutrition';

export function initialOnboarding(email) {
  return {
    email: email || '',
    gender: null,
    birthDate: new Date(2008, 8, 29),
    weightKg: lbToKg(154),
    weightUnit: 'lb',
    activityLevel: null,
    targetWeightKg: 70,
    targetUnit: 'kg',
    heightCm: ftInToCm(5, 8),
    heightUnit: 'ft/in',
  };
}

const OnboardingContext = createContext(null);

export function OnboardingProvider({ email, children }) {
  const [state, setState] = useState(() => initialOnboarding(email));
  const update = useCallback((patch) => setState((s) => ({ ...s, ...patch })), []);
  const savePartial = useCallback(async (patch) => {
    setState((s) => ({ ...s, ...patch }));
    try {
      await apiPut('/api/auth/profile', patch);
    } catch (e) {
      toastError('Could not save', e.message);
    }
  }, []);
  return <OnboardingContext.Provider value={{ state, update, savePartial }}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used inside OnboardingProvider');
  return ctx;
}
