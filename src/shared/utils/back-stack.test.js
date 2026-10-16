const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

/* global __dirname:readonly */

// Device back button (Android hardware back / browser back / iOS gesture)
// pops the router stack. That only walks back through onboarding steps when
// every forward move PUSHES (stack preserved) and only the final exit
// REPLACES (so back from the dashboard can't return to the wizard).
// These tests lock that contract: a single `replace` mid-flow silently
// breaks device-back for every step after it.
// Lives OUTSIDE src/app/ on purpose: expo-router's require.context bundles
// every file under src/app/ into the app, and this file's node:test imports
// break the web/native bundle (blank screen).
const DIR = path.join(__dirname, '..', '..', 'app', '(onboarding)');
const STEP_FILES = fs.readdirSync(DIR).filter((f) => f.endsWith('.js') && f !== '_layout.js' && !f.endsWith('.test.js'));

function read(file) {
  return fs.readFileSync(path.join(DIR, file), 'utf8');
}

describe('onboarding back-stack (device back button)', () => {
  it('every step route exists for the canonical order', () => {
    const { ORDER, PATH } = require('../../features/onboarding/steps');
    for (const step of ORDER) {
      assert.ok(PATH[step], `steps.js has no route for ${step}`);
      assert.ok(
        fs.existsSync(path.join(DIR, `${PATH[step]}.js`)),
        `missing route file for step ${step}`
      );
    }
  });

  it('forward moves push (back walks to the previous step)', () => {
    const offenders = STEP_FILES.filter((f) => /router\.replace/.test(read(f)) && f !== 'nutrition-plan.js');
    assert.deepEqual(offenders, [], `these steps replace instead of push — device back skips them: ${offenders}`);
    const pushes = STEP_FILES.filter((f) => /router\.push\(nextPath/.test(read(f)));
    assert.ok(pushes.length >= 8, `expected 8 push-driven steps, found ${pushes.length}`);
  });

  it('only the final step replaces (dashboard exit, never back into the wizard)', () => {
    const src = read('nutrition-plan.js');
    assert.match(src, /router\.replace\('\/\(tabs\)\/dashboard'\)/, 'final step must replace to the dashboard');
  });

  it('no step redirects mid-flow (Redirect would break the stack)', () => {
    const offenders = STEP_FILES.filter((f) => /<Redirect|router\.dismiss/.test(read(f)));
    assert.deepEqual(offenders, [], `these steps redirect mid-flow: ${offenders}`);
  });

  it('onboarding state survives back (provider sits above the stack)', () => {
    const layout = fs.readFileSync(path.join(DIR, '_layout.js'), 'utf8');
    assert.match(layout, /<OnboardingProvider/, 'OnboardingProvider must wrap the group so back keeps entered data');
    assert.match(layout, /<Slot/, 'group layout must render the stack Slot');
  });

  it('every step except the first shows an in-UI back button', () => {
    // Forward moves push, so router.back() pops exactly one step — the same
    // behavior as the device back button. The first step (gender) has no
    // back: there is nowhere sensible to return to.
    const { ORDER, PATH } = require('../../features/onboarding/steps');
    for (const step of ORDER) {
      const file = `${PATH[step]}.js`;
      const src = fs.readFileSync(path.join(DIR, file), 'utf8');
      const screenFile = {
        gender: 'GenderScreen', planIntro: 'PlanIntroScreen', birthday: 'BirthdayScreen',
        currentWeight: 'CurrentWeightScreen', activity: 'ActivityScreen',
        targetWeight: 'TargetWeightScreen', height: 'HeightScreen',
        greatChoice: 'GreatChoiceScreen', nutritionPlan: 'NutritionPlanScreen',
      }[step];
      const screen = fs.readFileSync(
        path.join(__dirname, '..', '..', 'features', 'onboarding', 'screens', `${screenFile}.js`),
        'utf8'
      );
      if (step === 'gender') {
        assert.doesNotMatch(src, /onBack/, 'first step must not offer back (nowhere to go)');
        assert.doesNotMatch(screen, /onBack/, 'first step must not offer back (nowhere to go)');
      } else {
        assert.match(src, /onBack=\{\(\) => router\.back\(\)\}/, `${file} must pop one step via router.back()`);
        assert.match(screen, /onBack/, `${screenFile} must accept onBack`);
      }
      // Custom-layout steps render the button themselves; scaffold steps get
      // it from AuthScaffold (covered by the auth back-navigation contract).
      if (step === 'birthday' || step === 'nutritionPlan') {
        assert.match(screen, /BackButton/, `${screenFile} must render the shared BackButton`);
      }
    }
  });
});
