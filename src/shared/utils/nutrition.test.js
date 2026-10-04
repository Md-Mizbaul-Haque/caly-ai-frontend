const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const N = require('./nutrition');

describe('screenshot persona', () => {
  it('reproduces 1696 / 2332 / 175 / 78 / 233', () => {
    const p = N.calcPlan({ gender: 'male', weightKg: 70, heightCm: 173, age: 18, activityLevel: 'light' });
    assert.equal(p.bmr, 1696);
    assert.equal(p.amr, 2332);
    assert.equal(p.proteinG, 175);
    assert.equal(p.fatG, 78);
    assert.equal(p.carbsG, 233);
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
