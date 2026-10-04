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
  let age = now.getFullYear() - birthDate.getFullYear();
  const m = now.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birthDate.getDate())) age -= 1;
  return age;
}
function mifflinBmr({ gender, weightKg, heightCm, age }) {
  return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + (gender === 'male' ? 5 : -161));
}
function activityFactor(level) {
  return { sedentary: 1.2, light: 1.375, moderate: 1.55, high: 1.725 }[level] ?? 1.375;
}
function calcPlan({ gender, weightKg, heightCm, age, activityLevel }) {
  const bmr = mifflinBmr({ gender, weightKg, heightCm, age });
  const amr = Math.round(bmr * activityFactor(activityLevel));
  const proteinG = Math.round(2.5 * weightKg);
  const fatG = Math.round((0.3 * amr) / 9);
  const carbsG = Math.round((amr - proteinG * 4 - fatG * 9) / 4);
  return { bmr, amr, proteinG, fatG, carbsG };
}
function goalLabel(currentKg, targetKg) {
  const d = targetKg - currentKg;
  if (Math.abs(d) <= 1) return 'Maintain Weight';
  return d > 0 ? 'Gain Weight' : 'Lose Weight';
}
function snapToStep(value, min, step) {
  return Math.max(min, Math.round(value / step) * step);
}
function sanitizeCode(raw) { return (raw || '').replace(/\D/g, '').slice(0, 6); }

module.exports = { LB_PER_KG, CM_PER_IN, lbToKg, kgToLb, ftInToCm, cmToFtIn, calcAge, mifflinBmr, activityFactor, calcPlan, goalLabel, snapToStep, sanitizeCode };
