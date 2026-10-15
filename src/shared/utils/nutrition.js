const LB_PER_KG = 2.20462;
const CM_PER_IN = 2.54;

function lbToKg(lb) { return lb / LB_PER_KG; }
function kgToLb(kg) { return kg * LB_PER_KG; }
function ftInToCm(ft, inch) { return (ft * 12 + inch) * CM_PER_IN; }
function cmToFtIn(cm) {
  const totalIn = Math.round(cm / CM_PER_IN);
  return { ft: Math.floor(totalIn / 12), inch: totalIn % 12 };
}
function calcAge(birthDate, now = new Date()) {
  const b = birthDate instanceof Date ? birthDate : new Date(birthDate);
  if (Number.isNaN(b.getTime())) return NaN;
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age -= 1;
  return age;
}
// Mean of male (+5) / female (-161) so non-binary / prefer-not-to-say never
// silently gets one sex's formula (a "wrong plan for this user" bug).
function mifflinBmr({ gender, weightKg, heightCm, age }) {
  const c = gender === 'male' ? 5 : gender === 'female' ? -161 : -78;
  return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + c);
}
function activityFactor(level) {
  return { sedentary: 1.2, light: 1.375, moderate: 1.55, high: 1.725 }[level] ?? 1.375;
}
function calcPlan({ gender, weightKg, heightCm, age, activityLevel, targetWeightKg }) {
  const bmr = mifflinBmr({ gender, weightKg, heightCm, age });
  const amr = Math.round(bmr * activityFactor(activityLevel));
  // Evidence-based protein (matches backend service): 2.0 g/kg for loss,
  // else 1.8 — never the old 2.5 (excess renal/GI load, no added benefit).
  // Needs target to pick the rate; defaults to 1.8 when unknown (preview).
  let goal = null;
  try {
    if (typeof weightKg === 'number' && typeof targetWeightKg === 'number') goal = goalLabel(weightKg, targetWeightKg);
  } catch { goal = null; }
  const perKg = goal === 'Lose Weight' ? 2.0 : 1.8;
  const proteinG = Math.round(perKg * weightKg);
  const fatG = Math.round((0.3 * amr) / 9);
  // Clamp: extreme inputs (very high weight, very low budget) can otherwise
  // drive carbs negative, which would render as e.g. "-100g" on the plan.
  const carbsG = Math.max(0, Math.round((amr - proteinG * 4 - fatG * 9) / 4));
  return { bmr, amr, proteinG, fatG, carbsG };
}
function goalLabel(currentKg, targetKg) {
  const d = targetKg - currentKg;
  if (Math.abs(d) <= 1) return 'Maintain Weight';
  return d > 0 ? 'Gain Weight' : 'Lose Weight';
}
// Goal-kcal macro split (mirrors the backend nutritionPlan service so Home
// matches the stored plan): protein 2.0 g/kg on loss else 1.8, fat 30% of
// the goal, remainder carbs. Takes the FINAL goal kcal (deficits and safe
// floors already applied server-side) — never maintenance. Null on bad
// input so screens fall back instead of painting NaN.
function planMacrosFromGoal({ goalKcal, weightKg, targetWeightKg }) {
  const g = Number(goalKcal);
  if (!Number.isFinite(g) || g <= 0) return null;
  if (typeof weightKg !== 'number' || !Number.isFinite(weightKg) || weightKg <= 0) return null;
  if (typeof targetWeightKg !== 'number' || !Number.isFinite(targetWeightKg)) return null;
  let perKg = 1.8;
  try {
    if (goalLabel(weightKg, targetWeightKg) === 'Lose Weight') perKg = 2.0;
  } catch { perKg = 1.8; }
  const proteinG = Math.round(perKg * weightKg);
  const fatG = Math.round((0.3 * g) / 9);
  const carbsG = Math.max(0, Math.round((g - proteinG * 4 - fatG * 9) / 4));
  return { proteinG, fatG, carbsG };
}
function snapToStep(value, min, step) {
  return Math.max(min, Math.round(value / step) * step);
}
// Grid-snapped display value for a canonical-kg weight in the given unit.
// The ruler only ever rests on these exact values, so the big displayed
// number MUST be derived from this (never from the raw float) — otherwise
// the center tick and the number can disagree (e.g. ruler on 70, text 69.9).
function snapWeight(kg, unit) {
  return unit === 'lb' ? Math.round(kgToLb(kg)) : Math.round(kg * 2) / 2;
}
// Snapped value converted back to canonical kg (for goal labels / saves).
function snapWeightKg(kg, unit) {
  const s = snapWeight(kg, unit);
  return unit === 'lb' ? lbToKg(s) : s;
}
function sanitizeCode(raw) { return (raw || '').replace(/\D/g, '').slice(0, 6); }

// Accepts Date or ISO string (server round-trips dates as strings).
function normalizeBirthDate(v) {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (typeof v === 'string' && v) {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

// Completeness gate — plan is created ONLY when every field is present and
// sane. Returns [] when complete, else the missing/invalid field names so the
// UI can name exactly what to fix (never a generic "didn't work").
function missingOnboardingFields(s = {}) {
  const missing = [];
  if (!['male', 'female', 'nonbinary', 'prefer_not_to_say'].includes(s.gender)) missing.push('gender');
  if (!normalizeBirthDate(s.birthDate)) missing.push('birthDate');
  else if (calcAge(normalizeBirthDate(s.birthDate)) < 13) missing.push('birthDate');
  if (typeof s.heightCm !== 'number' || !(s.heightCm >= 100 && s.heightCm <= 250)) missing.push('heightCm');
  if (typeof s.weightKg !== 'number' || !(s.weightKg >= 25 && s.weightKg <= 350)) missing.push('weightKg');
  if (typeof s.targetWeightKg !== 'number' || !(s.targetWeightKg >= 25 && s.targetWeightKg <= 350)) missing.push('targetWeightKg');
  if (!['sedentary', 'light', 'moderate', 'high'].includes(s.activityLevel)) missing.push('activityLevel');
  return missing;
}

module.exports = { LB_PER_KG, CM_PER_IN, lbToKg, kgToLb, ftInToCm, cmToFtIn, calcAge, mifflinBmr, activityFactor, calcPlan, planMacrosFromGoal, goalLabel, snapToStep, sanitizeCode, snapWeight, snapWeightKg, normalizeBirthDate, missingOnboardingFields };
