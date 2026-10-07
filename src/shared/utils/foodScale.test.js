const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const S = require('./foodScale');

describe('scaleMacros', () => {
  it('scales per-100g macros linearly and rounds', () => {
    const f = { kcal: 402, protein: 24.9, carbs: 3.2, fat: 33.1 };
    assert.deepEqual(S.scaleMacros(f, 50), { kcal: 201, protein: 12.5, carbs: 1.6, fat: 16.6 });
    assert.deepEqual(S.scaleMacros(f, 100), { kcal: 402, protein: 24.9, carbs: 3.2, fat: 33.1 });
  });
  it('treats missing macros as 0', () => {
    assert.deepEqual(S.scaleMacros({ kcal: 100 }, 200), { kcal: 200, protein: 0, carbs: 0, fat: 0 });
  });
});

describe('scaleByFactor', () => {
  it('scales a logged meal by servings multiplier', () => {
    const m = { kcal: 150, protein: 5, carbs: 27, fat: 3 };
    assert.deepEqual(S.scaleByFactor(m, 2), { kcal: 300, protein: 10, carbs: 54, fat: 6 });
    assert.deepEqual(S.scaleByFactor(m, 0.5), { kcal: 75, protein: 2.5, carbs: 13.5, fat: 1.5 });
  });
});

describe('clampGrams', () => {
  it('clamps to 10..2000 and floors to int', () => {
    assert.equal(S.clampGrams(5), 10);
    assert.equal(S.clampGrams(2500), 2000);
    assert.equal(S.clampGrams(137.9), 137);
  });
});

describe('defaultMealType', () => {
  it('picks type by hour of day', () => {
    assert.equal(S.defaultMealType(8), 'Breakfast');
    assert.equal(S.defaultMealType(13), 'Lunch');
    assert.equal(S.defaultMealType(19), 'Dinner');
    assert.equal(S.defaultMealType(23), 'Snack');
  });
});

describe('recentFoods', () => {
  it('dedupes by name keeping the most recent, newest first', () => {
    const meals = [
      { name: 'Oatmeal', kcal: 150, loggedAt: '2026-01-01T08:00:00Z' },
      { name: 'oatmeal ', kcal: 150, loggedAt: '2026-01-03T08:00:00Z' },
      { name: 'Eggs', kcal: 140, loggedAt: '2026-01-02T08:00:00Z' },
    ];
    const out = S.recentFoods(meals, 10);
    assert.equal(out.length, 2);
    assert.equal(out[0].name, 'oatmeal');
    assert.equal(out[1].name, 'Eggs');
  });
  it('returns [] for empty input', () => {
    assert.deepEqual(S.recentFoods([], 5), []);
  });
});
