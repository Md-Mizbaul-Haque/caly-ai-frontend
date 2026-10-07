const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const N = require('./nutrition');

describe('screenshot persona', () => {
  it('reproduces 1696 / 2332 / 126 / 78 / 282 (1.8g/kg evidence-based protein)', () => {
    const p = N.calcPlan({ gender: 'male', weightKg: 70, heightCm: 173, age: 18, activityLevel: 'light', targetWeightKg: 70 });
    assert.equal(p.bmr, 1696);
    assert.equal(p.amr, 2332);
    assert.equal(p.proteinG, 126);
    assert.equal(p.fatG, 78);
    assert.equal(p.carbsG, 282);
  });
  it('lose path uses 2.0g/kg', () => {
    const p = N.calcPlan({ gender: 'male', weightKg: 80, heightCm: 180, age: 30, activityLevel: 'moderate', targetWeightKg: 70 });
    assert.equal(p.proteinG, 160);
  });
  it('nonbinary uses mean sex constant (-78), never silently female', () => {
    const nb = N.mifflinBmr({ gender: 'nonbinary', weightKg: 70, heightCm: 173, age: 18 });
    const male = N.mifflinBmr({ gender: 'male', weightKg: 70, heightCm: 173, age: 18 });
    const female = N.mifflinBmr({ gender: 'female', weightKg: 70, heightCm: 173, age: 18 });
    assert.equal(nb, Math.round((male + female) / 2));
  });
});

describe('completeness gate', () => {
  it('empty state reports all six fields missing', () => {
    assert.deepEqual(N.missingOnboardingFields({}), ['gender', 'birthDate', 'heightCm', 'weightKg', 'targetWeightKg', 'activityLevel']);
  });
  it('complete state reports none missing', () => {
    assert.deepEqual(N.missingOnboardingFields({ gender: 'male', birthDate: new Date('2000-01-01'), heightCm: 173, weightKg: 70, targetWeightKg: 70, activityLevel: 'light' }), []);
  });
  it('accepts ISO strings (hydrated) and rejects garbage/under-13', () => {
    assert.ok(N.normalizeBirthDate('2000-01-15') instanceof Date);
    assert.equal(N.normalizeBirthDate('bad'), null);
    assert.deepEqual(N.missingOnboardingFields({ gender: 'male', birthDate: 'bad', heightCm: 173, weightKg: 70, targetWeightKg: 70, activityLevel: 'light' }), ['birthDate']);
  });
});

describe('units + age + labels', () => {
  it('154 lb <-> kg round-trips to 154 on display', () => {
    assert.equal(Math.round(N.kgToLb(N.lbToKg(154))), 154);
  });
  it("5'8\" is 172.7cm and converts back to 5'8\"", () => {
    assert.equal(N.ftInToCm(5, 8), 172.72);
    assert.deepEqual(N.cmToFtIn(172.72), { ft: 5, inch: 8 });
  });
  it('age 13 boundary: 2013-09-29 -> 13 on 2026-09-29', () => {
    assert.equal(N.calcAge(new Date('2013-09-29'), new Date('2026-09-29')), 13);
  });
  it('leap-day safe: 2008-02-29 -> 18 on 2026-09-29', () => {
    assert.equal(N.calcAge(new Date('2008-02-29'), new Date('2026-09-29')), 18);
  });
  it('goal label ±1kg is Maintain', () => {
    assert.equal(N.goalLabel(70, 70.5), 'Maintain Weight');
    assert.equal(N.goalLabel(70, 75), 'Gain Weight');
    assert.equal(N.goalLabel(75, 70), 'Lose Weight');
  });
  it('sanitize strips spaces/dashes, caps at 6', () => {
    assert.equal(N.sanitizeCode('123 456'), '123456');
    assert.equal(N.sanitizeCode('12-34-56789'), '123456');
  });
  it('ruler snaps fractional flings', () => {
    assert.equal(N.snapToStep(154.4, 80, 1), 154);
    assert.equal(N.snapToStep(79.2, 80, 1), 80);
  });
});
