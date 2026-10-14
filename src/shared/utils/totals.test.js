const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { calcTotals } = require('./totals');

describe('calcTotals', () => {
  it('sums a normal day: 500/2000 -> remaining 1500, pct 25', () => {
    const t = calcTotals([{ kcal: 300, protein: 10, carbs: 20, fat: 5 }, { kcal: 200, protein: 5, carbs: 10, fat: 2 }], 2000);
    assert.equal(t.eaten, 500);
    assert.equal(t.remaining, 1500);
    assert.equal(t.pct, 25);
    assert.equal(t.goalUsed, 2000);
  });

  it('caps over-goal: remaining 0, pct 100', () => {
    const t = calcTotals([{ kcal: 2500 }], 2000);
    assert.equal(t.eaten, 2500);
    assert.equal(t.remaining, 0);
    assert.equal(t.pct, 100);
  });

  it('treats unset goal (0/undefined) as unset: remaining null, pct 0', () => {
    for (const g of [0, undefined, null, NaN]) {
      const t = calcTotals([{ kcal: 500 }], g);
      assert.equal(t.eaten, 500);
      assert.equal(t.remaining, null);
      assert.equal(t.pct, 0);
      assert.equal(t.goalUsed, null);
    }
  });

  it('ignores corrupt negative kcal instead of inflating remaining', () => {
    const t = calcTotals([{ kcal: -500 }, { kcal: 300 }], 2000);
    assert.equal(t.eaten, 300);
    assert.equal(t.remaining, 1700);
    assert.equal(t.pct, 15);
  });

  it('empty day with a goal -> zeros, full remaining', () => {
    const t = calcTotals([], 2000);
    assert.deepEqual([t.eaten, t.remaining, t.pct], [0, 2000, 0]);
    assert.equal(t.goalUsed, 2000);
  });
});
