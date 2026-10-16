const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { applyHydration } = require('./applyHydration');

function local() {
  return {
    gender: 'female',
    birthDate: new Date(1995, 5, 15),
    heightCm: 170,
    weightKg: 65,
    targetWeightKg: 60,
    activityLevel: 'light',
  };
}

describe('applyHydration (GET /me must not stomp just-tapped input)', () => {
  it('fills untouched keys from the server', () => {
    const next = applyHydration(
      { gender: null, birthDate: new Date(2008, 8, 29) },
      { gender: 'male', birthDate: '1990-01-01' },
      new Set()
    );
    assert.equal(next.gender, 'male');
    assert.ok(next.birthDate instanceof Date);
  });
  it('preserves dirty (just-tapped) keys over stale server data', () => {
    const before = local();
    const next = applyHydration(before, { gender: 'male', birthDate: '1990-01-01' }, new Set(['gender', 'birthDate']));
    assert.equal(next.gender, 'female');
    assert.equal(next.birthDate.getTime(), before.birthDate.getTime());
  });
  it('never lets falsy server values wipe local input', () => {
    const before = local();
    const next = applyHydration(before, { gender: null, heightCm: 'x', weightKg: undefined }, new Set());
    assert.equal(next.gender, 'female');
    assert.equal(next.heightCm, 170);
    assert.equal(next.weightKg, 65);
  });
  it('keeps local birthDate when the server date is garbage', () => {
    const before = local();
    const next = applyHydration(before, { birthDate: 'not-a-date' }, new Set());
    assert.equal(next.birthDate.getTime(), before.birthDate.getTime());
  });
  it('accepts server ISO strings for untouched dates', () => {
    const next = applyHydration(
      { birthDate: new Date(2008, 8, 29) },
      { birthDate: '1990-01-15T00:00:00.000Z' },
      new Set()
    );
    assert.equal(next.birthDate.getFullYear(), 1990);
  });
});
