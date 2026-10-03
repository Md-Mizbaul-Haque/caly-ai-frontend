# Onboarding + Auth UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dev-style AuthScreen with production login/register/verify + 11-step onboarding wizard and paywall, and extend the backend User/profile API with nullable onboarding fields.

**Architecture:** Backend first (additive User fields + exported `profileSchema`), then a pure-JS nutrition util with node tests, then shared auth UI primitives, then auth screens + App.js stage wiring, then onboarding screens in flow order, then plan/paywall + legacy retirement. No expo-router migration; navigation is `useState` stages in App.js plus step index in OnboardingWizard.

**Tech Stack:** Expo SDK 57, React 19, React Native, NativeWind, react-native-safe-area-context, lucide-react-native icons, Express + Mongoose + zod (backend), node:test for unit tests, `npx expo lint` for static checks.

**Spec:** `docs/superpowers/specs/2026-10-03-onboarding-design.md` (this plan argues from that spec; executors read both).

## Global Constraints

- Expo SDK ~57.0.26 — before touching any Expo API, read `expo` major version in `package.json` and fetch matching versioned docs; never answer from memory.
- After adding any library with native code: `npx expo install <package>`, then needs a dev build (`npx expo run:android|ios` or EAS). No new native deps expected in this plan.
- Never create or edit `android/` or `ios/` by hand (Continuous Native Generation); configure native behavior in `app.json`.
- Every bottom-docked CTA uses `useSafeAreaInsets()` with `Math.max(insets.bottom, 16) + 12`; parent `SafeAreaView edges={['top']}` stays top-only; scrollable screens put bottom padding in `contentContainerStyle`, not `style`.
- Design tokens: background `#F2F2F2`, card `#FFFFFF`, CTA black `#000000`, disabled CTA `bg-black/10` + `text-black/50`, link blue `#2D9CDB`, title 32px/800 black, subtitle 16px `#6B6B6B`, input `bg-white rounded-2xl border border-black/10 h-[72px] px-6`.
- Backend changes are additive only: all new User fields nullable with defaults; old login/register clients unaffected.
- Onboarding shows after register+verify only; login path calls `onAuthed` directly and never enters the wizard.
- Run `npx expo lint` (frontend, cwd `caly-ai-frontend`) and backend `npm test` before declaring any task done. Baseline: frontend lint 0 errors + 3 pre-existing warnings in PictureUploadScreen/ScanResultScreen; do not introduce new warnings.
- Deviation from spec (documented): spec lists `GenderCard.js` + `ActivityCard.js`; this plan implements one generic `OptionCard.js` consumed by both screens (identical interface, no duplication).

## Review Focus

- Birthday yielding age exactly 13 (boundary child / leap-day Feb 29) behaves as adult-allowed, never NaN or negative age.
- Unit toggle round-trips (154 lb → kg → lb, 5'8" → cm → ft/in) display stable values with no visible drift.
- Verification code pasted with spaces or dashes ("123 456", "12-34-56") is sanitized to 6 digits rather than rejected or crashing.
- Target weight within ±1 kg of current weight labels "Maintain Weight", not Lose/Gain flicker.
- Ruler fling landing between steps snaps to the nearest valid step instead of settling on fractional values.

---

## File structure

Created (frontend, cwd `caly-ai-frontend`):
- `src/utils/nutrition.js` — pure JS (no RN imports so `node --test` runs it): unit conversions, age, Mifflin-St Jeor BMR, activity factors, plan macros, goal label, ruler snap helper.
- `src/utils/nutrition.test.js` — node:test suite for the above.
- `src/components/auth/AuthScaffold.js` — back chevron + title + subtitle + scroll children + bottom CTA with safe-area padding.
- `src/components/auth/AuthInput.js` — white rounded TextInput wrapper.
- `src/components/auth/PasswordInput.js` — AuthInput + secureTextEntry with eye/eye-off toggle.
- `src/components/auth/BottomCTA.js` — black pill CTA with disabled grey state.
- `src/components/auth/UnitToggle.js` — segmented unit switch (lb|kg, ft/in|cm).
- `src/components/auth/RulerSlider.js` — snap ruler with blue center indicator.
- `src/components/auth/OptionCard.js` — selectable white card (gender + activity).
- `src/components/auth/MacroDots.js` — protein/fat/carbs dot row.
- `src/screens/LoginScreen.js`, `src/screens/RegisterScreen.js`, `src/screens/VerifyScreen.js`, `src/screens/ForgotScreen.js`.
- `src/screens/onboarding/OnboardingContext.js` — React context + `useOnboarding()` hook + `initialOnboarding(email)`.
- `src/screens/onboarding/OnboardingWizard.js` — step index router over all step screens.
- `src/screens/onboarding/GenderScreen.js`, `PlanIntroScreen.js`, `BirthdayScreen.js`, `CurrentWeightScreen.js`, `ActivityScreen.js`, `TargetWeightScreen.js`, `HeightScreen.js`, `GreatChoiceScreen.js`, `NutritionPlanScreen.js`, `PaywallScreen.js` (includes `DiscountModal` in-file).

Modified (frontend):
- `App.js` — unauth branch: `authStage` state (`welcome | login | register | verify | forgot | onboarding`), renders new screens, session-expiry resets to `welcome`.
- `src/screens/AuthScreen.js` — renamed to `src/screens/AuthScreen.legacy.js`, no longer rendered.

Created/modified (backend, cwd `caly-ai-backend`):
- Modify `src/models/User.js` — add 7 nullable fields.
- Modify `src/routes/auth.routes.js` — add + export `profileSchema`, extend `PUT /profile` to apply partial updates.
- Create `src/routes/auth.profile.test.js` — node:test suite for schema + model.
- Modify `package.json` test script → `node --test src/routes/`.

---

### Task 1: Backend onboarding fields + profile endpoint

**Files:**
- Modify: `E:\Caly Ai\caly-ai-backend\src\models\User.js`
- Modify: `E:\Caly Ai\caly-ai-backend\src\routes\auth.routes.js`
- Test: `E:\Caly Ai\caly-ai-backend\src\routes\auth.profile.test.js`
- Modify: `E:\Caly Ai\caly-ai-backend\package.json` (test script)

**Interfaces:**
- Consumes: existing `requireAuth` (sets `req.user` to Mongoose doc), existing `invalid(res, details)` helper, existing zod `z`.
- Produces: `profileSchema` (exported zod object, all-optional partial), User fields `gender, birthDate, heightCm, weightKg, targetWeightKg, activityLevel, onboardingCompleted`; `PUT /api/auth/profile` accepts any subset + `dailyGoalKcal`, returns `{ user }`.

- [ ] **Step 1: Write the failing test**

```js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const User = require('../models/User');
const { profileSchema } = require('./auth.routes');

describe('profileSchema', () => {
  it('accepts a partial onboarding payload', () => {
    const r = profileSchema.safeParse({ gender: 'female', activityLevel: 'light', weightKg: 70 });
    assert.equal(r.success, true);
  });
  it('rejects bad enum, out-of-range weight, under-500 goal', () => {
    assert.equal(profileSchema.safeParse({ gender: 'x' }).success, false);
    assert.equal(profileSchema.safeParse({ weightKg: 5 }).success, false);
    assert.equal(profileSchema.safeParse({ dailyGoalKcal: 100 }).success, false);
  });
  it('accepts empty object (no-op update)', () => {
    assert.equal(profileSchema.safeParse({}).success, true);
  });
});

describe('User onboarding defaults', () => {
  it('defaults new fields to null/false', () => {
    const u = new User({ name: 'A', email: 'a@b.co', passwordHash: 'x'.repeat(60) });
    assert.equal(u.gender, undefined);
    assert.equal(u.onboardingCompleted, false);
    const json = u.toJSON();
    assert.equal(json.onboardingCompleted, false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/routes/auth.profile.test.js` (cwd `caly-ai-backend`)
Expected: FAIL with "Cannot find module './auth.routes'" export `profileSchema` (test file missing + schema not exported).

- [ ] **Step 3: Write minimal implementation**

In `src/models/User.js`, inside the schema object after `dailyGoalKcal`, add:

```js
gender: { type: String, enum: ['male', 'female', 'nonbinary', 'prefer_not_to_say'], default: null },
birthDate: { type: Date, default: null },
heightCm: { type: Number, min: 100, max: 250, default: null },
weightKg: { type: Number, min: 25, max: 350, default: null },
targetWeightKg: { type: Number, min: 25, max: 350, default: null },
activityLevel: { type: String, enum: ['sedentary', 'light', 'moderate', 'high'], default: null },
onboardingCompleted: { type: Boolean, default: false },
```

In `src/routes/auth.routes.js`, replace the PUT /profile block with:

```js
const genderSchema = z.enum(['male', 'female', 'nonbinary', 'prefer_not_to_say']);
const activitySchema = z.enum(['sedentary', 'light', 'moderate', 'high']);
const profileSchema = z.object({
  dailyGoalKcal: z.number().int('dailyGoalKcal must be an integer').gte(500).lte(10000).optional(),
  gender: genderSchema.optional(),
  birthDate: z.coerce.date().refine((d) => d <= new Date(), 'birthDate must not be in the future').optional(),
  heightCm: z.number().gte(100).lte(250).optional(),
  weightKg: z.number().gte(25).lte(350).optional(),
  targetWeightKg: z.number().gte(25).lte(350).optional(),
  activityLevel: activitySchema.optional(),
  onboardingCompleted: z.boolean().optional(),
});

// PUT /api/auth/profile
router.put('/profile', requireAuth, async (req, res) => {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) return invalid(res, parsed.error.issues);
  Object.assign(req.user, parsed.data);
  await req.user.save();
  res.json({ user: req.user });
});

module.exports = router;
module.exports.profileSchema = profileSchema;
```

In `package.json`, change test script to: `"test": "node --test src/routes/"`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test` (cwd `caly-ai-backend`)
Expected: PASS — meals suite + new profile suite, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add src/models/User.js src/routes/auth.routes.js src/routes/auth.profile.test.js package.json
git commit -m "feat(backend): onboarding profile fields"
```

---

### Task 2: Nutrition + units utility with tests

**Files:**
- Create: `E:\Caly Ai\caly-ai-frontend\src\utils\nutrition.js`
- Test: `E:\Caly Ai\caly-ai-frontend\src\utils\nutrition.test.js`

**Interfaces:**
- Consumes: nothing (pure JS, zero RN imports so `node --test` runs it).
- Produces:
  - `LB_PER_KG = 2.20462`, `CM_PER_IN = 2.54`
  - `lbToKg(lb: number): number`, `kgToLb(kg: number): number`
  - `ftInToCm(ft: number, inch: number): number`, `cmToFtIn(cm: number): { ft: number, inch: number }` (inch rounded 0–11)
  - `calcAge(birthDate: Date, now?: Date): number` (floor, leap-day safe)
  - `mifflinBmr({ gender: 'male'|other, weightKg: number, heightCm: number, age: number }): number` (rounded; male +5 else −161)
  - `activityFactor(level: 'sedentary'|'light'|'moderate'|'high'): number` (1.2 / 1.375 / 1.55 / 1.725)
  - `calcPlan({ gender, weightKg, heightCm, age, activityLevel }): { bmr: number, amr: number, proteinG: number, fatG: number, carbsG: number }` (protein = round(2.5·kg), fat = round(0.30·amr/9), carbs = round((amr − 4·protein − 9·fat)/4))
  - `goalLabel(currentKg: number, targetKg: number): 'Lose Weight' | 'Maintain Weight' | 'Gain Weight'` (±1 kg → Maintain)
  - `snapToStep(value: number, min: number, step: number): number` (clamps ≥ min, rounds to step)
  - `sanitizeCode(raw: string): string` (digits only, max 6)

- [ ] **Step 1: Write the failing test**

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/utils/nutrition.test.js` (cwd `caly-ai-frontend`)
Expected: FAIL with "Cannot find module './nutrition'".

- [ ] **Step 3: Write minimal implementation**

```js
const LB_PER_KG = 2.20462;
const CM_PER_IN = 2.54;

function lbToKg(lb) { return lb / LB_PER_KG; }
function kgToLb(kg) { return kg * LB_PER_KG; }
function ftInToCm(ft, inch) { return (ft * 12 + inch) * CM_PER_IN; }
function cmToFtIn(cm) {
  const totalIn = Math.round(cm / CM_PER_IN);
  return { ft: Math.floor(totalIn / 12), inch: totalIn % 12 };
}
function calcAge(birthDate, now = new Date()) {
  let age = now.getFullYear() - birthDate.getFullYear();
  const m = now.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birthDate.getDate())) age -= 1;
  return age;
}
function mifflinBmr({ gender, weightKg, heightCm, age }) {
  return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + (gender === 'male' ? 5 : -161));
}
function activityFactor(level) {
  return { sedentary: 1.2, light: 1.375, moderate: 1.55, high: 1.725 }[level] ?? 1.375;
}
function calcPlan({ gender, weightKg, heightCm, age, activityLevel }) {
  const bmr = mifflinBmr({ gender, weightKg, heightCm, age });
  const amr = Math.round(bmr * activityFactor(activityLevel));
  const proteinG = Math.round(2.5 * weightKg);
  const fatG = Math.round((0.3 * amr) / 9);
  const carbsG = Math.round((amr - proteinG * 4 - fatG * 9) / 4);
  return { bmr, amr, proteinG, fatG, carbsG };
}
function goalLabel(currentKg, targetKg) {
  const d = targetKg - currentKg;
  if (Math.abs(d) <= 1) return 'Maintain Weight';
  return d > 0 ? 'Gain Weight' : 'Lose Weight';
}
function snapToStep(value, min, step) {
  return Math.max(min, Math.round(value / step) * step);
}
function sanitizeCode(raw) { return (raw || '').replace(/\D/g, '').slice(0, 6); }

module.exports = { LB_PER_KG, CM_PER_IN, lbToKg, kgToLb, ftInToCm, cmToFtIn, calcAge, mifflinBmr, activityFactor, calcPlan, goalLabel, snapToStep, sanitizeCode };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/utils/nutrition.test.js` (cwd `caly-ai-frontend`)
Expected: PASS, 8 subtests.

- [ ] **Step 5: Commit**

```bash
git add src/utils/nutrition.js src/utils/nutrition.test.js
git commit -m "feat: nutrition calc util with tests"
```

---

### Task 3: Shared auth UI primitives

**Files:**
- Create: `src/components/auth/AuthScaffold.js`, `AuthInput.js`, `PasswordInput.js`, `BottomCTA.js`, `UnitToggle.js`, `RulerSlider.js`, `OptionCard.js`, `MacroDots.js`

**Interfaces:**
- Consumes: `react-native-safe-area-context` (`useSafeAreaInsets`), `lucide-react-native` (`Eye`, `EyeOff`, `ChevronLeft`), `src/theme/tokens.js` border color.
- Produces:
  - `<AuthScaffold title: string, subtitle?: string, onBack?: () => void, ctaLabel: string, onCta: () => void, ctaDisabled?: boolean, bottomNote?: ReactNode, children>` — back chevron 48×48 rounded-2xl border, title 32/800, ScrollView children, BottomCTA with `Math.max(insets.bottom,16)+12` padding.
  - `<AuthInput value, onChangeText, placeholder, keyboardType?, autoCapitalize?, testID?>` — `bg-white rounded-2xl border border-black/10 h-[72px] px-6 text-[17px]`.
  - `<PasswordInput value, onChangeText, placeholder?, testID?>` — AuthInput + eye toggle, `secureTextEntry` default true.
  - `<BottomCTA label, onPress, disabled?, testID?>` — `h-[60px] rounded-full`, black / `bg-black/10`.
  - `<UnitToggle options: [string, string], value: string, onChange>` — segmented pill, white knob.
  - `<RulerSlider min, max, step, value, onChange(value:number)>` — horizontal ScrollView ruler, snaps via `snapToStep`, blue center line.
  - `<OptionCard title, subtitle?, selected, onPress, icon?: ReactNode>` — white rounded-3xl card, selected `border-black border-2`.
  - `<MacroDots proteinG, fatG, carbsG>` — red/amber/cyan dot row.

- [ ] **Step 1: Write the failing check** — no unit runner for RN components; the check is lint + import graph: create the 8 files, then run `node -e "['./src/components/auth/AuthScaffold.js',...].forEach(f=>require('fs').accessSync(f))"` — fails before files exist.

- [ ] **Step 2: Run to verify it fails** — run the command above; expected: ENOENT on first missing file.

- [ ] **Step 3: Write minimal implementation** — create the 8 files exactly per Interfaces above. `AuthScaffold` skeleton:

```jsx
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import BottomCTA from './BottomCTA';

export default function AuthScaffold({ title, subtitle, onBack, ctaLabel, onCta, ctaDisabled, bottomNote, children }) {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-[#F2F2F2]">
      <ScrollView
        className="flex-1 px-6 pt-6"
        contentContainerStyle={{ paddingBottom: 16, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        {onBack && (
          <Pressable onPress={onBack} testID="auth-back" accessibilityRole="button"
            className="w-12 h-12 rounded-2xl border border-black/20 bg-[#F2F2F2] items-center justify-center mb-6">
            <ChevronLeft size={26} color="#1A1A1A" />
          </Pressable>
        )}
        <Text className="text-[32px] font-extrabold text-black leading-[38px]">{title}</Text>
        {!!subtitle && <Text className="text-[16px] text-[#6B6B6B] mt-2 mb-6">{subtitle}</Text>}
        <View className="flex-1">{children}</View>
      </ScrollView>
      <View className="px-6" style={{ paddingBottom: Math.max(insets.bottom, 16) + 12 }}>
        <BottomCTA label={ctaLabel} onPress={onCta} disabled={ctaDisabled} />
        {bottomNote}
      </View>
    </View>
  );
}
```

`AuthInput.js`:

```jsx
import { TextInput } from 'react-native';

export default function AuthInput({ value, onChangeText, placeholder, keyboardType, autoCapitalize = 'none', testID, noMargin }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#8A8A8A"
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      testID={testID}
      className={`bg-white rounded-2xl border border-black/10 px-6 text-[17px] text-black ${noMargin ? '' : 'mb-4'}`}
      style={{ height: 72 }}
    />
  );
}
```

`PasswordInput.js`:

```jsx
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import AuthInput from './AuthInput';

export default function PasswordInput({ value, onChangeText, placeholder = 'Enter your password', testID = 'password-input' }) {
  const [hidden, setHidden] = useState(true);
  return (
    <View className="relative mb-4">
      <AuthInput value={value} onChangeText={onChangeText} placeholder={placeholder} testID={testID} noMargin />
      <Pressable
        onPress={() => setHidden((h) => !h)}
        testID="password-visibility"
        accessibilityRole="button"
        className="absolute right-5 top-6"
        hitSlop={12}
      >
        {hidden ? <EyeOff size={24} color="#4A4A4A" /> : <Eye size={24} color="#4A4A4A" />}
      </Pressable>
    </View>
  );
}
```

`PasswordInput`'s wrapper owns the `mb-4` margin; the nested `AuthInput` uses `noMargin` so spacing never doubles.

`BottomCTA.js`:

```jsx
import { Pressable, Text } from 'react-native';

export default function BottomCTA({ label, onPress, disabled, testID }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      testID={testID ?? 'bottom-cta'}
      accessibilityRole="button"
      className={`rounded-full items-center justify-center ${disabled ? 'bg-black/10' : 'bg-black'}`}
      style={{ height: 60 }}
    >
      <Text className={`text-[20px] font-medium ${disabled ? 'text-black/50' : 'text-white'}`}>{label}</Text>
    </Pressable>
  );
}
```

`UnitToggle.js`:

```jsx
import { Pressable, Text, View } from 'react-native';

export default function UnitToggle({ options, value, onChange, testID = 'unit-toggle' }) {
  return (
    <View testID={testID} className="self-center flex-row bg-black/5 rounded-full p-1 mb-8">
      {options.map((opt) => {
        const active = opt === value;
        return (
          <Pressable
            key={opt}
            onPress={() => onChange(opt)}
            accessibilityRole="button"
            className={`px-8 py-2 rounded-full ${active ? 'bg-white' : 'bg-transparent'}`}
            style={active ? { elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4 } : null}
          >
            <Text className={`text-[18px] ${active ? 'text-black font-medium' : 'text-black/50'}`}>{opt}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
```

`RulerSlider.js`:

```jsx
import { useRef } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { snapToStep } from '../../utils/nutrition';

const TICK_W = 12;

export default function RulerSlider({ min, max, step, value, onChange, testID = 'ruler' }) {
  const ref = useRef(null);
  const count = Math.floor((max - min) / step) + 1;
  const ticks = Array.from({ length: count }, (_, i) => min + i * step);
  return (
    <View testID={testID}>
      <View className="items-center mb-2">
        <View style={{ width: 3, height: 56, backgroundColor: '#2D9CDB', borderRadius: 2 }} />
      </View>
      <ScrollView
        ref={ref}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={TICK_W}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: 160 }}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / TICK_W);
          onChange(snapToStep(min + idx * step, min, step));
        }}
      >
        {ticks.map((t, i) => {
          const major = i % 10 === 0;
          return (
            <View key={t} style={{ width: TICK_W }} className="items-center">
              <View style={{ width: 2, height: major ? 40 : 22, backgroundColor: '#1A1A1A' }} />
              {major && <Text className="text-[11px] text-black/40 mt-1">{t}</Text>}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
```

`OptionCard.js`:

```jsx
import { Pressable, Text, View } from 'react-native';

export default function OptionCard({ title, subtitle, selected, onPress, icon, testID }) {
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      className={`bg-white rounded-3xl p-5 flex-row items-center ${selected ? 'border-black' : 'border-transparent'}`}
      style={{ borderWidth: selected ? 2 : 0 }}
    >
      {!!icon && <View className="mr-4">{icon}</View>}
      <View className="flex-1">
        <Text className="text-[20px] font-semibold text-black">{title}</Text>
        {!!subtitle && <Text className="text-[15px] text-black/60 mt-1">{subtitle}</Text>}
      </View>
    </Pressable>
  );
}
```

`MacroDots.js`:

```jsx
import { Text, View } from 'react-native';

export default function MacroDots({ proteinG, fatG, carbsG }) {
  const items = [
    { dot: '#F2555A', amount: `${proteinG}g`, label: 'protein' },
    { dot: '#FFB020', amount: `${fatG}g`, label: 'fat' },
    { dot: '#22D3EE', amount: `${carbsG}g`, label: 'carbs' },
  ];
  return (
    <View className="flex-row justify-around mt-4">
      {items.map((m) => (
        <View key={m.label} className="items-center">
          <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: m.dot }} />
          <Text className="text-[22px] font-semibold text-black mt-2">{m.amount}</Text>
          <Text className="text-[16px] text-black/60">{m.label}</Text>
        </View>
      ))}
    </View>
  );
}
```

- [ ] **Step 4: Run checks to verify they pass**

Run: `npx expo lint` (cwd `caly-ai-frontend`)
Expected: 0 errors, no new warnings.

- [ ] **Step 5: Commit**

```bash
git add src/components/auth/
git commit -m "feat: shared auth UI primitives"
```

---

### Task 4: Login / Register / Verify / Forgot screens + App wiring

**Files:**
- Create: `src/screens/LoginScreen.js`, `RegisterScreen.js`, `VerifyScreen.js`, `ForgotScreen.js`
- Modify: `App.js` (unauth branch → `authStage` state machine)
- Test: manual walkthrough + lint (no RN unit runner)

**Interfaces:**
- Consumes: Task 3 primitives, `src/lib/authApi` (`login, register, verifyEmail, resendCode, forgotPassword, resetPassword`), `sanitizeCode` from Task 2, `toastSuccess/toastError`, `ThemedToast`.
- Produces: screens with props —
  - `LoginScreen({ onBack, onSubmit(email, pw), onForgot, onSwitchRegister, busy, prefillEmail? })`
  - `RegisterScreen({ onBack, onSubmit(name, email, pw), onSwitchLogin, busy })`
  - `VerifyScreen({ email, onBack, onVerify(email, code), onResend, busy })` (code sanitized via `sanitizeCode`, Verify enabled only at 6 digits)
  - `ForgotScreen({ onBack, onDone })` (email → code → new password via existing API)
  - App.js owns API calls + stage transitions; 403 `needsVerification` → verify stage with email prefilled.

- [ ] **Step 1: Write the failing check** — `node -e` file-existence check for the 4 screens; fails with ENOENT before creation.

- [ ] **Step 2: Run to verify it fails** — expected ENOENT.

- [ ] **Step 3: Write minimal implementation** — the 4 screens per spec copy:
  - Login: title "Welcome back! Good to see you again!", `AuthInput` email, `PasswordInput`, right-aligned "Forgot Password?" link, CTA "Login" (disabled unless email regex + pw ≥ 1 char for login attempt; API enforces), bottom note `Don't have an account?` + blue `Register Now` (`#2D9CDB`).
  - Register: title "Hello! Register now to get started.", Name + Email + Password inputs, CTA "Register" (disabled unless name non-empty + email valid + pw ≥ 8), bottom `Already have an account?` + `Login Now`.
  - Verify: title "Almost there! Just verify your email.", read-only email card, code `AuthInput` (`------` placeholder, numeric, `sanitizeCode` on change), right link "I didn't get a code." → `resendCode`, CTA "Verify".
  - Forgot: same scaffold, 3-phase local state (email → code+new password), reuses `forgotPassword/resetPassword`.
  - App.js: replace `authChoice` with `authStage` (`welcome|login|register|verify|forgot|onboarding`), `stageEmail` state, wire `onAuthed` for login/forgot (direct) vs verify-of-new-registration (→ onboarding with email).

- [ ] **Step 4: Run checks to verify they pass**

Run: `npx expo lint` — 0 errors. Manual: welcome → Login (empty shows disabled CTA) → Register → Verify; back chevrons return correctly; wrong password shows error toast.

- [ ] **Step 5: Commit**

```bash
git add src/screens/LoginScreen.js src/screens/RegisterScreen.js src/screens/VerifyScreen.js src/screens/ForgotScreen.js App.js
git commit -m "feat: production auth screens and stage wiring"
```

---

### Task 5: Onboarding context + Gender / PlanIntro / Birthday / CurrentWeight

**Files:**
- Create: `src/screens/onboarding/OnboardingContext.js`, `OnboardingWizard.js`, `GenderScreen.js`, `PlanIntroScreen.js`, `BirthdayScreen.js`, `CurrentWeightScreen.js`

**Interfaces:**
- Consumes: Task 2 (`calcAge`, `lbToKg/kgToLb`, `snapToStep`), Task 3 primitives, `apiPut` from `lib/api` for best-effort saves.
- Produces:
  - `OnboardingContext = { state: { email, gender: null|'male'|'female'|'nonbinary'|'prefer_not_to_say', birthDate: Date|null (default 2008-09-29), weightKg: number (default lbToKg(154)), weightUnit: 'lb'|'kg' (default 'lb'), activityLevel, targetWeightKg, targetUnit, heightCm (default ftInToCm(5,8)), heightUnit }, update(patch), savePartial(patch) }` + `initialOnboarding(email)` + `useOnboarding()`.
  - `OnboardingWizard({ email, onComplete, onExit })` — holds `stepIndex`, renders steps in order, Back goes to previous step (first step → `onExit` to welcome).
  - Each screen: `({ onNext, onBack })` reading/writing context; Continue/Next disabled until valid (gender/activity required; others always valid via defaults).

- [ ] **Step 1: Write the failing check** — file-existence `node -e` for the 6 files; fails ENOENT.

- [ ] **Step 2: Run to verify it fails** — expected ENOENT.

- [ ] **Step 3: Write minimal implementation**
  - Context with `useState`, `savePartial` = `apiPut('/api/auth/profile', patch)` wrapped in try/catch + error toast, never throws.
  - GenderScreen: title "What is your gender?", subtitle per spec, 3 `OptionCard`s in a row (icons: use lucide `User` / text glyphs ♂-style avoided — use lucide `User`, `UserRound`, `Circle` + labels Male/Female/Non-binary) + full-width "Prefer Not To Say"; Continue disabled until `gender != null`.
  - PlanIntroScreen: title "Let's create your plan", subtitle "Your personalized health journey", 3 body paragraphs verbatim from screenshot, CTA "Let's Begin".
  - BirthdayScreen: title "When were you born?", subtitle per spec, month/day/year `RulerSlider`s (month 1–12 step 1 with name display "September", day 1–31, year 1930–2015), CTA "Next".
  - CurrentWeightScreen: title "What is your current weight?", subtitle per spec, `UnitToggle lb|kg`, big display ("154 lb" / converted kg 1-decimal), weight `RulerSlider` (min 30kg/66lb equivalent, step 0.5kg / 1lb), CTA "Next" → `savePartial({ weightKg })`.

- [ ] **Step 4: Run checks to verify they pass**

Run: `npx expo lint` — 0 errors. `node --test src/utils/nutrition.test.js` still passes. Manual: register → verify → gender (Continue grey → enabled on tap) → plan intro → birthday defaults Sep 29 2008 → weight 154 lb toggle to kg shows 69.9 kg, toggle back shows 154 lb (no drift beyond rounding).

- [ ] **Step 5: Commit**

```bash
git add src/screens/onboarding/
git commit -m "feat: onboarding wizard part 1"
```

---

### Task 6: Activity / TargetWeight / Height / GreatChoice

**Files:**
- Create: `src/screens/onboarding/ActivityScreen.js`, `TargetWeightScreen.js`, `HeightScreen.js`, `GreatChoiceScreen.js`
- `RulerSlider.js` already exists from Task 3 (no change unless snap bugs found).

**Interfaces:**
- Consumes: `useOnboarding()` from Task 5, `goalLabel`, `kgToLb/lbToKg`, `ftInToCm/cmToFtIn` from Task 2, Task 3 primitives.
- Produces: screens `({ onNext, onBack })`:
  - Activity: 4 `OptionCard`s (Sedentary / Lightly Active / Moderately Active / Highly Active with spec subtitles, lucide icons `Sofa, Footprints, Bike, Dumbbell`), Next disabled until selection → `savePartial({ activityLevel })`.
  - TargetWeight: `UnitToggle` (default kg), big display, scale icon + `{goalLabel}` line ("Maintain Weight" etc.), `RulerSlider`, "Current: X kg/lb" line, Next → `savePartial({ targetWeightKg })`.
  - Height: `UnitToggle ft/in|cm`, big display (`5'8"` / cm), `RulerSlider`, Next → `savePartial({ heightCm })`.
  - GreatChoice: blue "Great choice!" + goal-variant copy (Maintain/Lose/Gain per `goalLabel`), CTA "See your plan".

- [ ] **Step 1: Write the failing check** — file-existence check for the 4 files; fails ENOENT.

- [ ] **Step 2: Run to verify it fails** — expected ENOENT.

- [ ] **Step 3: Write minimal implementation** — per Interfaces; GreatChoice copy variants:
  - Maintain: "Maintaining your current weight is a healthy goal." + "We'll help you track your nutrition and activity to stay within your maintenance range." + "Consistency is key to long-term success."
  - Lose/Gain: same structure with "Losing/Gaining weight steadily is a healthy goal." + range-appropriate second line (no invented medical claims).

- [ ] **Step 4: Run checks to verify they pass**

Run: `npx expo lint` — 0 errors. Manual: activity requires selection; target 70kg vs current 69.9kg shows "Maintain Weight" (covers Review Focus ±1kg case); height toggle ft/in↔cm stable.

- [ ] **Step 5: Commit**

```bash
git add src/screens/onboarding/ActivityScreen.js src/screens/onboarding/TargetWeightScreen.js src/screens/onboarding/HeightScreen.js src/screens/onboarding/GreatChoiceScreen.js
git commit -m "feat: onboarding wizard part 2"
```

---

### Task 7: NutritionPlan / Paywall / completion + legacy retirement

**Files:**
- Create: `src/screens/onboarding/NutritionPlanScreen.js`, `PaywallScreen.js` (with in-file `DiscountModal`)
- Modify: `App.js` (onboarding completion → `onAuthed`), `src/lib/authApi.js` (`updateProfile` accepts partial object)
- Delete/rename: `src/screens/AuthScreen.js` → `src/screens/AuthScreen.legacy.js`
- Modify: `caly-ai-frontend/src/components/auth/MacroDots.js` — already from Task 3, reused here.

**Interfaces:**
- Consumes: `calcPlan`, `calcAge` (Task 2), `useOnboarding()` (Task 5), `apiPut('/api/auth/profile')`, existing `fetchMe`.
- Produces:
  - `NutritionPlanScreen({ onNext })` — scrollable: header "Your Nutrition Plan" + blue check circle, "Your Goal" Maintenance/Loss/Gain card, "Daily Targets" card (`{amr}` calories + `MacroDots`), "Details" card rows (Age `calcAge` + " years", Height formatted per unit, Weight `70.0 kg`, Activity capitalized short label, BMR/AMR cal), bulb-icon disclaimer verbatim, sticky "Let's Get Started" CTA.
  - `PaywallScreen({ onDone })` — title "Unlock SnapCalorie Premium to reach your goals faster.", food image (`require('../../../assets/...')` — reuse existing asset or solid placeholder block if no licensed image; X dismiss → first press opens `DiscountModal`, second press `onDone`; "Start 7 day free trial!" CTA → `onDone`; price line "7 days free, then BDT11,000.00 per year (BDT916.66/mo)"; Privacy/Restore/Terms row (toast placeholders).
  - `DiscountModal({ onAccept, onClose })` — "Want a discount? We get it.", strikethrough BDT11,000 → pink BDT2,200/yr, "80% OFF" badge, checkmark "No commitment, cancel anytime", "Accept Offer" → `onDone`.
  - Completion: `PUT` exactly `{ gender: state.gender, birthDate: state.birthDate.toISOString(), heightCm: Math.round(state.heightCm), weightKg: round1(state.weightKg), targetWeightKg: round1(state.targetWeightKg), activityLevel: state.activityLevel, dailyGoalKcal: amr, onboardingCompleted: true }` (unit-only fields `weightUnit/targetUnit/heightUnit` are display state and are never sent) then `onAuthed(user)`. `round1` = `Math.round(n * 10) / 10`.
  - `updateProfile(partial: object)` — backwards compatible: if passed a number, behaves as before (`{ dailyGoalKcal: n }`).

- [ ] **Step 1: Write the failing check** — file-existence for the 2 screens; fails ENOENT. Plus `grep updateProfile src/lib/authApi.js` shows number-only signature.

- [ ] **Step 2: Run to verify it fails** — expected ENOENT + old signature.

- [ ] **Step 3: Write minimal implementation** — per Interfaces. `updateProfile` new body:

```js
export async function updateProfile(dailyGoalKcalOrPartial) {
  const body = typeof dailyGoalKcalOrPartial === 'number'
    ? { dailyGoalKcal: dailyGoalKcalOrPartial }
    : dailyGoalKcalOrPartial;
  return apiPut('/api/auth/profile', body); // { user }
}
```

Demo-persona check: gender male, 70kg, 173cm, 18y, light → header "2332 calories", dots 175/78/233, Details rows exactly as spec.

- [ ] **Step 4: Run checks to verify they pass**

Run: `npx expo lint` — 0 errors. `npm test` (backend) — passes. Manual full walkthrough register → … → plan numbers match → paywall X → discount → Accept → main app; ProfileScreen goal reflects 2332.

- [ ] **Step 5: Commit**

```bash
git add src/screens/onboarding/NutritionPlanScreen.js src/screens/onboarding/PaywallScreen.js App.js src/lib/authApi.js
git mv src/screens/AuthScreen.js src/screens/AuthScreen.legacy.js
git commit -m "feat: nutrition plan, paywall, onboarding completion"
```

---

### Task 8: Full-flow verification + safe-area audit

**Files:** none (verification only; fix fallout in place if found, one fix per failure, re-verify).

- [ ] **Step 1: Frontend static gate**

Run: `npx expo lint` (cwd `caly-ai-frontend`)
Expected: 0 errors, only the 3 pre-existing warnings.

- [ ] **Step 2: Unit gates**

Run: `node --test src/utils/nutrition.test.js` (cwd `caly-ai-frontend`); `npm test` (cwd `caly-ai-backend`)
Expected: all PASS.

- [ ] **Step 3: On-device walkthrough (Android 3-button nav AND gesture nav)**

  1. Fresh install / clear token → welcome (Caly AI) → tap Register.
  2. Register → verify (paste "123 456" with space → accepted as 123456; resend link works).
  3. Gender → Continue grey until selection.
  4. Plan intro → birthday → current weight (toggle lb/kg twice, value stable) → activity → target (Maintain label at 70 vs 69.9) → height → great choice → plan (2332/175/78/233 for demo persona) → paywall → X → discount → Accept → main app.
  4. Kill + relaunch → logged in, no onboarding repeat. Logout/session-expire → welcome.
  5. At every step, CTA fully above system nav bar; scroll reaches CTA on small screens.

- [ ] **Step 4: Record results** — append a `docs/superpowers/plans/2026-10-03-onboarding-verification.md` note (pass/fail per step, device models) — or report inline if docs writes are unwanted.

- [ ] **Step 5: Commit** (only if fallout fixes were needed)

```bash
git add -A
git commit -m "fix: onboarding verification fallout"
```
