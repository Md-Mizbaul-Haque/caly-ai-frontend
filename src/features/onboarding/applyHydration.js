const { normalizeBirthDate } = require('../../shared/utils/nutrition');

// Merges a GET /api/auth/me user onto local onboarding state WITHOUT stomping
// values the user just tapped: keys in `dirty` (touched via update/savePartial
// while the GET was in flight) always win over server data. Falsy server
// values never wipe local input; an unparseable server birthDate keeps local.
function applyHydration(state, user, dirty) {
  const next = { ...state };
  if (!user) return next;
  const touched = (k) => dirty && dirty.has(k);
  if (!touched('gender') && user.gender) next.gender = user.gender;
  if (!touched('birthDate') && user.birthDate) {
    const d = normalizeBirthDate(user.birthDate);
    if (d) next.birthDate = d;
  }
  if (!touched('heightCm') && typeof user.heightCm === 'number') next.heightCm = user.heightCm;
  if (!touched('weightKg') && typeof user.weightKg === 'number') next.weightKg = user.weightKg;
  if (!touched('targetWeightKg') && typeof user.targetWeightKg === 'number') next.targetWeightKg = user.targetWeightKg;
  if (!touched('activityLevel') && user.activityLevel) next.activityLevel = user.activityLevel;
  return next;
}

module.exports = { applyHydration };
