// Pure BMI math for the Progress BMI card (no imports — node --test safe).
// Formula mirrors the server (services/nutritionPlan.js): kg/m^2, 1 decimal.
// Advice is informational only; underweight-loss is steered to maintenance
// like the backend downgrade, never cheered into a deficit.

const LB_PER_KG = 2.20462;

const BMI_DISCLAIMER = 'Informational only — not medical advice. Check with a clinician for your plan.';

function round1(n) {
  return Math.round(n * 10) / 10;
}

function validHeightCm(cm) {
  const v = Number(cm);
  return Number.isFinite(v) && v >= 100 && v <= 250;
}

function validWeightKg(kg) {
  const v = Number(kg);
  return Number.isFinite(v) && v >= 25 && v <= 350;
}

// 1-decimal BMI, or null when inputs are unusable (screen shows a prompt,
// never NaN). Bounds match onboarding/backend so garbage can't print absurd.
function calcBmi(weightKg, heightCm) {
  if (!validWeightKg(weightKg) || !validHeightCm(heightCm)) return null;
  const m = Number(heightCm) / 100;
  const bmi = round1(Number(weightKg) / (m * m));
  return Number.isFinite(bmi) ? bmi : null;
}

function bmiCategory(bmi) {
  const v = Number(bmi);
  if (!Number.isFinite(v)) return null;
  if (v < 18.5) return 'Underweight';
  if (v < 25) return 'Healthy';
  if (v < 30) return 'Overweight';
  return 'Obesity';
}

function categoryTone(category) {
  // Chip ink: green healthy, amber under, orange over, red obese.
  if (category === 'Healthy') return '#22C55E';
  if (category === 'Overweight') return '#f2470c';
  if (category === 'Obesity') return '#E64D4D';
  return '#E8A317';
}

// Latest weigh-in (lbs) wins; profile kg is the fallback. Out-of-range
// readings resolve to null so a corrupt row can't fake a BMI.
function resolveBmiWeight({ latestLbs, profileKg } = {}) {
  const lbs = Number(latestLbs);
  if (Number.isFinite(lbs) && lbs > 0) {
    const kg = round1(lbs / LB_PER_KG);
    if (validWeightKg(kg)) return kg;
    return null;
  }
  const kg = Number(profileKg);
  return validWeightKg(kg) ? kg : null;
}

// goalDir: +1 gaining toward goal, -1 losing, 0 maintain/unset (same idiom
// as ProgressScreen's trend alignment).
function bmiAdvice(category, goalDir) {
  if (category === 'Underweight') {
    if (goalDir < 0) {
      return {
        headline: 'Hold at maintenance for now',
        detail: 'Your BMI is below the healthy range — maintenance fits better than a deficit. Consider raising your goal; a clinician can advise.',
      };
    }
    return {
      headline: 'Build up steadily',
      detail: 'You are below the healthy range — a steady surplus toward your goal can help. A clinician can advise.',
    };
  }
  if (category === 'Healthy') {
    if (goalDir < 0) return { headline: 'Stay the course', detail: 'You are in the healthy range — a gradual deficit toward your goal works well.' };
    if (goalDir > 0) return { headline: 'Build steadily', detail: 'You are in the healthy range — a steady surplus plus protein toward your goal works well.' };
    return { headline: 'Looking good', detail: 'You are in the healthy range — keep up balanced logging.' };
  }
  if (category === 'Overweight') {
    return {
      headline: goalDir > 0 ? 'Recheck your direction' : 'A gradual deficit helps',
      detail: goalDir > 0
        ? 'Your BMI is above the healthy range yet your goal points up — confirm your target, then work toward it gradually.'
        : 'Your BMI is above the healthy range — a gradual deficit toward your goal helps. Small steps compound.',
    };
  }
  // Obesity
  return {
    headline: goalDir > 0 ? 'Recheck your direction' : 'Work down gradually',
    detail: goalDir > 0
      ? 'Your BMI is well above the healthy range yet your goal points up — please confirm your target with a clinician.'
      : 'Your BMI is well above the healthy range — a gradual deficit helps. Consider checking with a clinician for a plan.',
  };
}

module.exports = {
  LB_PER_KG,
  BMI_DISCLAIMER,
  calcBmi,
  bmiCategory,
  categoryTone,
  resolveBmiWeight,
  validHeightCm,
  bmiAdvice,
};
