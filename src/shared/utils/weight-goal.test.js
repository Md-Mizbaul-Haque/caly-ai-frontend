const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

/* global __dirname:readonly */

function read(rel) {
  return fs.readFileSync(path.join(__dirname, '..', '..', rel), 'utf8');
}

// Goal editing lives on the Weight Tracker screen (More -> Weight Tracker,
// also linked from the Progress goal-row pen) — never in the Log Weight
// sheet. These guards stop either side from drifting back.
describe('weight-goal ownership', () => {
  it('Weight Tracker screen loads and saves the goal with validation', () => {
    const screen = read('app/weight-tracker.js');
    assert.match(screen, /fetchWeightGoal/, 'must load the stored goal');
    assert.match(screen, /setWeightGoal/, 'must persist via the goal endpoint');
    assert.match(screen, /weightLog/, 'must validate via the shared weightLog helpers');
  });

  it('Log Weight sheet carries no goal input', () => {
    const sheet = read('shared/components/WeightLogSheet.js');
    assert.doesNotMatch(sheet, /Goal weight/, 'sheet must not render a goal field');
    assert.doesNotMatch(sheet, /shouldSendGoal/, 'sheet must not send a goal payload');
    assert.doesNotMatch(sheet, /currentGoal/, 'sheet must not accept a goal prop');
  });

  it('Progress pen routes to the Weight Tracker screen', () => {
    const progress = read('features/progress/screens/ProgressScreen.js');
    assert.match(progress, /onEditGoal/, 'pen must call an onEditGoal prop');
    const history = read('app/(tabs)/history.js');
    assert.match(
      history,
      /onEditGoal=\{\(\) => router\.push\('\/weight-tracker'\)\}/,
      'history route must link the pen to /weight-tracker'
    );
  });
});
