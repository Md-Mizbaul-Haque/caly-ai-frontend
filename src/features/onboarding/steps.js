// Canonical onboarding step order (transcribed from OnboardingWizard STEPS).
// Back navigation uses router.back(); only forward movement needs this map.
export const ORDER = [
  'gender',
  'planIntro',
  'birthday',
  'currentWeight',
  'activity',
  'targetWeight',
  'height',
  'greatChoice',
  'nutritionPlan',
  'paywall',
];

export function nextOf(step) {
  const i = ORDER.indexOf(step);
  if (i < 0 || i >= ORDER.length - 1) return ORDER[ORDER.length - 1];
  return ORDER[i + 1];
}

// Step key → route filename (kebab-case) inside the (onboarding) group.
export const PATH = {
  gender: 'gender',
  planIntro: 'plan-intro',
  birthday: 'birthday',
  currentWeight: 'current-weight',
  activity: 'activity',
  targetWeight: 'target-weight',
  height: 'height',
  greatChoice: 'great-choice',
  nutritionPlan: 'nutrition-plan',
  paywall: 'paywall',
};

export function nextPath(step) {
  return `/(onboarding)/${PATH[nextOf(step)]}`;
}
