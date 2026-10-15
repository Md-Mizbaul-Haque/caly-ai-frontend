const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  calcBmi,
  bmiCategory,
  bmiAdvice,
  resolveBmiWeight,
  validHeightCm,
  BMI_DISCLAIMER,
} = require('./bmi');

describe('BMI helper (Progress BMI card)', () => {
  it('computes 1-decimal BMI like the backend service', () => {
    assert.equal(calcBmi(70, 175), 22.9);
    assert.equal(calcBmi(50, 180), 15.4);
    assert.equal(calcBmi(90, 170), 31.1);
  });

  it('returns null for missing/invalid inputs (never NaN on screen)', () => {
    assert.equal(calcBmi(null, 175), null);
    assert.equal(calcBmi(70, null), null);
    assert.equal(calcBmi(70, 0), null);
    assert.equal(calcBmi(-70, 175), null);
    assert.equal(calcBmi(70, 99), null);
    assert.equal(calcBmi(70, 251), null);
  });

  it('bands at WHO cutoffs 18.5 / 25 / 30', () => {
    assert.equal(bmiCategory(18.4), 'Underweight');
    assert.equal(bmiCategory(18.5), 'Healthy');
    assert.equal(bmiCategory(24.9), 'Healthy');
    assert.equal(bmiCategory(25), 'Overweight');
    assert.equal(bmiCategory(29.9), 'Overweight');
    assert.equal(bmiCategory(30), 'Obesity');
  });

  it('prefers the latest weigh-in (lbs) over the profile weight', () => {
    // 154 lb -> 69.9 kg, not the stale 80 kg profile value.
    assert.equal(resolveBmiWeight({ latestLbs: 154, profileKg: 80 }), 69.9);
    assert.equal(resolveBmiWeight({ latestLbs: null, profileKg: 80 }), 80);
    assert.equal(resolveBmiWeight({ latestLbs: undefined, profileKg: null }), null);
  });

  it('rejects garbage weights instead of printing an absurd BMI', () => {
    assert.equal(resolveBmiWeight({ latestLbs: 5, profileKg: 80 }), null);
    assert.equal(resolveBmiWeight({ latestLbs: NaN, profileKg: 500 }), null);
  });

  it('underweight + losing advises maintenance, not loss', () => {
    const a = bmiAdvice('Underweight', -1);
    assert.match(a.headline + a.detail, /maintenance/i, 'underweight loss must not cheer on a deficit');
  });

  it('every advice carries a clinician/disclaimer note', () => {
    for (const c of ['Underweight', 'Healthy', 'Overweight', 'Obesity']) {
      const a = bmiAdvice(c, 0);
      assert.ok(a.headline && a.detail, `${c} advice is empty`);
    }
    assert.match(BMI_DISCLAIMER, /not medical advice/i);
  });

  it('height gate matches onboarding bounds (100-250 cm)', () => {
    assert.equal(validHeightCm(175), true);
    assert.equal(validHeightCm(99), false);
    assert.equal(validHeightCm(null), false);
  });
});
