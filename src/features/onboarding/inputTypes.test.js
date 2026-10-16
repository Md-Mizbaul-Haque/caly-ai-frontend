const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

/* global __dirname:readonly */

// Regression: BirthdayScreen once passed a pre-stringified ISO date into
// savePartial, which stores the raw patch in local state. The next render
// called d.getFullYear() on a string -> "undefined is not a function" redbox.
// savePartial stores patches verbatim (OnboardingContext setState patch), so
// callers must pass state-typed values and let JSON.stringify convert Dates
// on the wire. ISO conversion belongs only in fire-and-forget PUTs that never
// touch local state (the final plan PUT).
const DIR = __dirname;
function read(f) {
  return fs.readFileSync(path.join(DIR, f), 'utf8');
}

describe('onboarding input types (no stringified Dates into local state)', () => {
  it('BirthdayScreen passes the Date object to savePartial (wire serializes it)', () => {
    const src = read(path.join('screens', 'BirthdayScreen.js'));
    assert.ok(
      /savePartial\(\{\s*birthDate:\s*state\.birthDate\s*\}\)/.test(src),
      'BirthdayScreen must pass state.birthDate (Date) — JSON.stringify converts it on the wire'
    );
    assert.ok(
      !/savePartial\(\{\s*birthDate:\s*state\.birthDate\.toISOString\(\)/.test(src),
      'pre-stringified birthDate would overwrite the Date in local state and crash getFullYear'
    );
  });
  it('NutritionPlanScreen may stringify (its PUT never touches local state)', () => {
    const src = read(path.join('screens', 'NutritionPlanScreen.js'));
    assert.ok(/birthDate:\s*birthDate\.toISOString\(\)/.test(src));
    assert.ok(!/setState/.test(src), 'plan screen must stay stateless');
  });
});
