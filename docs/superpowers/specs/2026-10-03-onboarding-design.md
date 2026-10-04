# Onboarding + Auth UI Design

Date: 2026-10-03
Status: approved (conversational design) — pending written-spec review
Scope: UI-first batch + backward-compatible backend extension

## 1. Outcome & success criteria

Replace the dev-style `AuthScreen` (chip modes) with production auth +
onboarding UI matching the 15 provided screenshots, keeping `Caly AI`
branding on the welcome screen and `SnapCalorie` copy only where the
screenshots show paywall text (configurable).

Success:
- Unauthenticated flow is fully navigable:
  `welcome → login | register → verify → gender → planIntro →
  birthday → currentWeight → activity → targetWeight → height →
  greatChoice → nutritionPlan → paywall (+discount modal) → main app`.
- No bottom content hidden behind Android 3-button / gesture nav on any
  device (uses `useSafeAreaInsets`, same pattern as `BottomNav.js`).
- `npx expo lint` passes with 0 errors.
- Existing authed tabs (dashboard / log / progress / profile) untouched.
- Backend changes are additive and backward-compatible.

## 2. Constraints & decisions

- Frontend: Expo SDK 57 (`package.json`: `expo ~57.0.26`), React 19,
  NativeWind, `react-native-safe-area-context`. No `expo-router`
  migration in this batch (`App.js` uses `useState` tab state).
- Backend `User` today has only
  `name / email / passwordHash / emailVerified / dailyGoalKcal` plus
  verify/reset code fields. There is nowhere to store gender, birth
  date, height, weights, or activity yet.
- User decisions (2026-10-03):
  1. Backend: **UI + extend backend** (add nullable onboarding fields +
     extend profile API now).
  2. Trigger: onboarding shows **after register + verify only**.
     Existing logins go straight to the app.
  3. Welcome keeps `Caly AI` branding with existing `caly-logo.png`.
- UI-only policy for this batch: login / register / verify call the real
  `src/lib/authApi.js`; every onboarding step after verify works with
  local state + best-effort profile `PUT` (UI never blocks on network).

## 3. Architecture

```
App.js (unauth branch)
 ├─ WelcomeScreen (existing, fixed for safe-area)
 ├─ LoginScreen ──────────┐
 ├─ RegisterScreen ───────┤→ real authApi
 ├─ VerifyScreen ─────────┘     (login / register / verify-email /
 │                               resend-code / forgot-password)
 └─ OnboardingWizard (new, shown after register+verify only)
     ├─ OnboardingContext (gender, birthDate, weight, weightUnit,
     │   targetWeight, height, heightUnit, activityLevel, email)
     ├─ Gender → PlanIntro → Birthday → CurrentWeight → Activity →
     │   TargetWeight → Height → GreatChoice → NutritionPlan → Paywall
     └─ onComplete → PUT profile { onboardingCompleted: true }
        → onAuthed(user) → main tabs
```

- No changes to authed `DashboardScreen / LogFoodScreen /
  ProgressScreen / ProfileScreen` except optionally surfacing the
  computed `dailyGoalKcal`.
- No new navigation library. `App.js` holds `authStage` state:
  `welcome | login | register | verify | onboarding | done`.
  `OnboardingWizard` holds its own `stepIndex` state.
- Shared theme: screens use `bg-[#F2F2F2]`, cards `bg-white rounded-3xl`,
  inputs `bg-white rounded-2xl border border-black/10 h-[72px] px-6`,
  primary CTA `bg-black rounded-full h-[60px]`, disabled CTA
  `bg-black/10` with `text-black/50`, link blue `#2D9CDB`-ish.

## 4. Components & files

New shared components (`src/components/auth/`):
- `AuthScaffold.js` — props: `title, subtitle, onBack, children,
  ctaLabel, onCta, ctaDisabled, bottomNote`. Renders back chevron
  (`rounded-2xl border border-black/20 w-12 h-12`), bold 32px title,
  grey subtitle, scrollable children, bottom CTA with
  `paddingBottom: Math.max(insets.bottom, 16) + 12`. This is the
  permanent anti-overlap solution.
- `AuthInput.js` — white rounded input, props: `value, onChangeText,
  placeholder, keyboardType, autoCapitalize`.
- `PasswordInput.js` — `AuthInput` + `secureTextEntry` with eye /
  eye-off toggle (lucide icons; eye-off default like screenshots).
- `BottomCTA.js` — black pill button, `disabled` → grey.
- `UnitToggle.js` — segmented `lb|kg` and `ft/in|cm` pill (white knob
  with shadow, like screenshots).
- `RulerSlider.js` — horizontal snap ruler: ticks via horizontal
  `ScrollView` / `FlatList`, long ticks every 10, blue center indicator.
  Props: `min, max, step, value, onChange, format`. Initial values:
  current weight 154 lb, target 70 kg, height 5'8", birthday Sep 29 2008.
- `GenderCard.js`, `ActivityCard.js` — white selectable cards, selected
  state `border-black border-2`.
- `MacroDots.js` — red / amber / cyan dots + `175g protein / 78g fat /
  233g carbs` row.

New screens (`src/screens/onboarding/` + top-level auth screens):
- `LoginScreen.js` — "Welcome back! Good to see you again!",
  email + password, "Forgot Password?" → reuses existing
  `forgotPassword / resetPassword` API via a `ForgotScreen` step
  (same UI style, email + code + new password), black Login CTA, bottom
  "Don't have an account? Register Now" (blue link → register).
- `RegisterScreen.js` — "Hello! Register now to get started.",
  Name + Email + Password, black Register CTA,
  "Already have an account? Login Now" → login.
- `VerifyScreen.js` — "Almost there! Just verify your email.",
  read-only email display, 6-box/dash code input (`------`
  placeholder), "I didn't get a code." → `resendCode`, Verify CTA.
- `GenderScreen.js` — "What is your gender?" + "This helps us create
  your personalized health plan." Male / Female / Non-binary cards +
  full-width "Prefer Not To Say". Continue disabled until selection
  (grey like screenshot).
- `PlanIntroScreen.js` — "Let's create your plan" + 3 paragraphs from
  screenshot, "Let's Begin" CTA.
- `BirthdayScreen.js` — "When were you born?" Month / Day / Year ruler
  (default September 29 2008), Next CTA.
- `CurrentWeightScreen.js` — "What is your current weight?",
  `lb|kg` toggle, big "154 lb" display, ruler, Next.
- `ActivityScreen.js` — "Lifestyle Activity", 4 cards (Sedentary /
  Lightly / Moderately / Highly Active with subtitles from screenshots),
  Next disabled until selection.
- `TargetWeightScreen.js` — "What is your target weight?", `lb|kg`
  toggle (default kg), "70 kg", scale icon + dynamic label
  (Lose / Maintain / Gain Weight vs current), ruler, "Current: 70 kg",
  Next.
- `HeightScreen.js` — "How tall are you?", `ft/in|cm` toggle,
  big `5'8"` (or cm), ruler, Next.
- `GreatChoiceScreen.js` — "Great choice!" (blue) + goal text
  (Maintain / Lose / Gain variants), "See your plan" CTA.
- `NutritionPlanScreen.js` — scrollable: "Your Nutrition Plan" + blue
  check, "Your Goal" Maintenance card, "Daily Targets" 2332 calories +
  macros, "Details" card (Age 18 years, Height 5'8", Weight 70.0 kg,
  Activity Light, BMR 1696 cal, AMR 2332 cal), disclaimer with bulb icon,
  sticky "Let's Get Started" CTA.
- `PaywallScreen.js` — "Unlock SnapCalorie Premium..." + food image,
  "No Commitment - Cancel Anytime", "Start 7 day free trial!" CTA,
  "7 days free, then BDT11,000.00 per year", Privacy / Restore Purchase /
  Terms row, X dismiss → main app. `DiscountModal` — appears on the
  first paywall X press (second X enters the app): "Want a discount?",
  strikethrough BDT11,000 → BDT2,200 pink, "80% OFF" badge, "Accept
  Offer" CTA → main app.

Modified files:
- `App.js` — unauth branch: add `authStage` + `onboarding` rendering;
  session-expiry resets to `welcome`. Authed branch unchanged.
- `src/screens/AuthScreen.js` — deprecated in this batch: renamed to
  `AuthScreen.legacy.js` on completion and no longer rendered; new
  `LoginScreen / RegisterScreen / VerifyScreen` are the only unauth
  auth UI. The legacy file is deleted once the new flow is manually
  verified.
- `src/screens/WelcomeScreen.js` — already safe-area fixed; no change.
- `src/utils/nutrition.js` (new) — `calcAge(birthDate)`,
  `mifflinStJeor({ gender, weightKg, heightCm, age })` → BMR,
  `activityFactor(level)` (Sedentary 1.2 / Light 1.375 / Moderate 1.55 /
  High 1.725), `amr = round(bmr * factor)`, macros
  protein `1.1g/lb → 175g`, fat `25% cal / 9`, carbs remainder
  (reproduces 2332 / 175 / 78 / 233 for the screenshot persona).
  Unit conversions `lb↔kg`, `ft/in↔cm`.

## 5. Data flow & backend changes

Backend (`caly-ai-backend`):
- `src/models/User.js` += nullable fields:
  `gender: { type: String, enum: ['male','female','nonbinary',
  'prefer_not_to_say', null], default: null }`,
  `birthDate: { type: Date, default: null }`,
  `heightCm: { type: Number, min: 100, max: 250, default: null }`,
  `weightKg: { type: Number, min: 25, max: 350, default: null }`,
  `targetWeightKg: { type: Number, min: 25, max: 350, default: null }`,
  `activityLevel: { type: String,
  enum: ['sedentary','light','moderate','high', null], default: null }`,
  `onboardingCompleted: { type: Boolean, default: false }`.
  All existing validators unchanged; `toJSON` strips nothing new
  (no secrets in new fields).
- `PUT /api/auth/profile` extends from `{ dailyGoalKcal }` to accept any
  subset of the new fields + `dailyGoalKcal`; returns `{ user }`.
  `GET /api/auth/me` returns them automatically via the model.
- Migration: none (nullable + defaults; existing users get
  `onboardingCompleted: false` but trigger rule keeps them out of the
  wizard since they reach the app via login).

Frontend flow:
1. `register(name, email, pw)` → needs verification → `verify` stage
   (prefill email).
2. `verifyEmail(email, code)` → success `{ token, user }` → init
   `OnboardingContext` → `onboarding` stage (login path never enters
   here; it calls `onAuthed` directly).
3. Each onboarding Next: validate locally → update context → fire
   best-effort `apiPut('/api/auth/profile', partial)` (failures toasted,
   never block Next).
4. `NutritionPlan` computes locally via `nutrition.js` for instant UI;
   `Let's Get Started` → `PUT { onboardingCompleted: true,
   dailyGoalKcal: amr }` → `onAuthed(user)`.
5. Paywall buttons are static in this batch (no store purchase SDK):
   Start trial / Accept Offer / X all → `onAuthed` (enter app).

## 6. Error handling & validation

- Field rules: email regex (same as backend), password ≥ 8 chars,
  code exactly 6 digits, name non-empty, birthday 1900-01-01..today
  and age ≥ 13, weight 25–350 kg (converted), height 100–250 cm,
  gender + activity required before Continue/Next enables.
- API errors surface via existing `toastSuccess / toastError`
  (`ThemedToast` already mounted in `App.js` unauth branch).
- 403 unverified-login → auto-toast + jump to verify stage with email
  prefilled (reuse current `login()` `needsVerification` behavior).
- Network failure during onboarding save: toast once, keep local state,
  allow continuing; final `onboardingCompleted` PUT retried on
  "Let's Get Started" press.
- Ruler components clamp out-of-range values; unit toggle converts and
  rounds display (`70.0 kg`, `154 lb`, `5'8"`).

## 7. Safe-area & styling contract (permanent fix)

- Every bottom-docked CTA uses `AuthScaffold` /
  `useSafeAreaInsets()` with `Math.max(insets.bottom, 16) + 12`.
- Parent `SafeAreaView edges={['top']}` stays top-only; screens own
  their bottom inset (same as `BottomNav.js`). Never fixed `pb-10`
  alone.
- Scrollable screens put bottom padding in `contentContainerStyle`,
  not `style`.
- Design tokens: background `#F2F2F2`, card `#FFFFFF`, CTA black
  `#000000`, link blue `#2D9CDB` (or theme primary where appropriate),
  title 32px / 800, subtitle 16px `#6B6B6B`, input height 72px.

## 8. Testing

- `npx expo lint` — must be 0 errors (current baseline: 3 pre-existing
  warnings in `PictureUploadScreen` / `ScanResultScreen`).
- Manual walkthrough (Android 3-button nav + gesture nav):
  welcome → register → verify (6-digit) → gender ( selection enables
  Continue) → plan intro → birthday → current weight (toggle lb/kg,
  ruler) → activity → target weight (maintain label) → height →
  great choice → nutrition plan numbers (2332 / 175 / 78 / 233 for the
  demo persona) → paywall → discount modal → main app.
- Verify no CTA hidden behind system nav at any step; rotate / small
  screen sanity (scroll still reaches CTA).
- Backend: `PUT /api/auth/profile` with partial onboarding payloads,
  `GET /api/auth/me` reflects fields; old login/register clients
  unaffected.
