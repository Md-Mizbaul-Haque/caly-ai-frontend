const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { groupMealsForDay } = require('./groupMeals');

const chicken = (over = {}) => ({
  id: 'a',
  name: 'Chicken breast, grilled wi.',
  kcal: 202,
  protein: 21.2,
  carbs: 7.3,
  fat: 9.2,
  mealType: 'Dinner',
  loggedAt: '2026-10-09T19:06:00+06:00',
  ...over,
});

describe('groupMealsForDay', () => {
  it('collapses same name + mealType into one summed card', () => {
    const out = groupMealsForDay([
      chicken({ id: 'a', loggedAt: '2026-10-09T19:06:00+06:00' }),
      chicken({ id: 'b', loggedAt: '2026-10-09T19:07:00+06:00' }),
    ]);
    assert.equal(out.length, 1);
    assert.equal(out[0].count, 2);
    assert.equal(out[0].kcal, 404);
    assert.deepEqual([out[0].protein, out[0].carbs, out[0].fat], [42.4, 14.6, 18.4]);
    assert.deepEqual(out[0].ids, ['a', 'b']);
  });

  it('uses the most recent id so delete removes one serving', () => {
    const out = groupMealsForDay([
      chicken({ id: 'a', loggedAt: '2026-10-09T19:06:00+06:00' }),
      chicken({ id: 'b', loggedAt: '2026-10-09T19:07:00+06:00' }),
    ]);
    assert.equal(out[0].id, 'b');
    assert.equal(out[0].loggedAt, '2026-10-09T19:07:00+06:00');
  });

  it('keeps different mealTypes and names separate', () => {
    const out = groupMealsForDay([
      chicken({ id: 'a', mealType: 'Lunch' }),
      chicken({ id: 'b', mealType: 'Dinner' }),
      { ...chicken({ id: 'c' }), name: 'Chicken curry' },
    ]);
    assert.equal(out.length, 3);
    assert.ok(out.every((g) => g.count === 1));
  });

  it('matches case-insensitively and buckets nameless entries as Unnamed', () => {
    const out = groupMealsForDay([
      chicken({ id: 'a', name: '  CHICKEN BREAST, GRILLED WI. ' }),
      chicken({ id: 'b', name: 'chicken breast, grilled wi.' }),
      { id: 'c', name: '   ', kcal: 99 },
    ]);
    assert.equal(out.length, 2);
    assert.equal(out[0].count, 2);
    const unnamed = out.find((g) => g.name === 'Unnamed');
    assert.ok(unnamed, 'nameless meal must stay visible, never invisible calories');
    assert.equal(unnamed.kcal, 99);
  });
});
