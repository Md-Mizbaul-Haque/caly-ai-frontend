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

  it('Weight Tracker paints instantly from cache with a setup block (no bare form)', () => {
    const screen = read('app/weight-tracker.js');
    assert.match(screen, /readCache/, 'must paint cached goal instantly');
    assert.match(screen, /writeCache/, 'must persist goal for next instant paint');
    assert.match(screen, /Update goal|Start setup|Set up goal/i, 'main view must offer a setup block, not just a form');
    assert.match(screen, /pace/i, 'wizard must ask pace');
    assert.match(screen, /activityLevel|Activity/i, 'wizard must ask activity');
  });

  it('goal save recomputes the daily calorie plan', () => {
    const screen = read('app/weight-tracker.js');
    assert.match(screen, /setGoal|refreshUser/, 'must sync session daily kcal after save');
    assert.match(screen, /dailyGoalKcal|kcal per day|Daily Targets/i, 'must surface the recomputed calorie plan');
    const api = read('shared/lib/weightsApi.js');
    assert.match(api, /pace/, 'goal endpoint must send pace');
    assert.match(api, /activityLevel/, 'goal endpoint must send activity');
  });

  it('names missing profile fields and never silently keeps a stale target', () => {
    const screen = read('app/weight-tracker.js');
    assert.match(screen, /missing/, 'must read the missing[] the server returns');
    assert.match(screen, /Complete setup|complete.*profile/i, 'must offer a path to complete the profile');
    assert.match(screen, /planError/, 'must handle plan recompute failure explicitly');
    assert.match(screen, /planAttention/, 'must flag Home when the kcal did not update');
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

  it('Weight Tracker revalidates from the database on focus, not just mount', () => {
    const screen = read('app/weight-tracker.js');
    assert.match(screen, /useFocusEffect/, 'returning to the screen must refetch, not paint yesterday\u2019s cache');
    assert.match(screen, /fetchWeightGoal/, 'focus path must hit the goal endpoint');
    assert.match(screen, /refreshUser/, 'focus path must refresh session kcal/current-weight');
  });

  it('fresh network goal syncs the wizard draft without clobbering typing', () => {
    const screen = read('app/weight-tracker.js');
    assert.match(screen, /lastSynced|syncedGoal/, 'must track the last synced value to tell typing apart from staleness');
  });

  it('a failed refresh with cached data says so instead of silently painting stale', () => {
    const screen = read('app/weight-tracker.js');
    assert.match(screen, /showing saved data|Couldn\u2019t refresh|could not refresh/i, 'stale paint must be labeled');
  });

  it('Profile has no manual goal editor — the plan owns the target', () => {
    const screen = read('features/progress/screens/ProfileScreen.js');
    assert.doesNotMatch(screen, /updateProfile/, 'profile must not write goals directly');
    assert.doesNotMatch(screen, /Daily goal \(kcal\)/, 'no manual kcal typing anywhere');
    assert.doesNotMatch(screen, /TextInput/, 'profile needs no text input without the editor');
  });

  it('goal-less Home routes Set goal to the Weight Tracker wizard', () => {
    const dash = read('features/dashboard/screens/DashboardScreen.js');
    assert.match(dash, /router\.push\("\/weight-tracker"\)/, 'empty-goal CTA must open the plan wizard, not a manual editor');
    const help = read('app/help.js');
    assert.doesNotMatch(help, /Profile and save a new goal/, 'help must not point at manual entry');
    assert.match(help, /Weight Tracker/, 'help must point at the plan wizard');
  });
});
