# Frontend Modular Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate `caly-ai-frontend` to Expo Router file-based routes plus feature modules with zero behavior change.

**Architecture:** Extract `App.js` (443 lines) into a session module, move screens/components into `features/` + `shared/` untouched, add thin `src/app/` routes + layouts, then flip the entry and delete the old shell. Each task leaves the app bootable.

**Tech Stack:** Expo SDK 57, React 19, Expo Router (SDK-57 peer via `npx expo install expo-router`), NativeWind, JavaScript (no TypeScript).

**Spec:** `docs/superpowers/specs/2026-10-04-frontend-modular-restructure-design.md` — the plan argues from the spec; executors read both.

## Global Constraints

- Expo SDK 57 — installars only via `npx expo install` (never bare npm for native-capable libs).
- JavaScript only — no `.tsx` conversions.
- Expo Go must keep working — no custom native modules.
- Zero UI, copy, color, spacing, navigation-behavior, or auth-flow changes.
- `npx expo lint` must pass with 0 errors after every task.
- No automated tests in this cycle — explicit user direction ("I don't need any test"). Verification is lint + boot/walkthrough steps written into each task.
- `src/theme/tokens.js` is the only source of design values — no new colors/radii.
- Commit after every task; never commit secrets (`.env` stays untracked).

## Review Focus

1. Stale Expo Go bundle hiding a regression — after every task, reload from a clean bundle (close + reopen), never trust hot-reload alone for the verdict.
2. Guard redirect loop (`welcome ↔ tabs` flashing) — the gate must compare the current segment group before replacing; covered by Task 5 steps.
3. Onboarding step-0 back must log out to welcome, not to tabs — covered by the Task 6 back-on-every-screen walkthrough.
4. Scan photo state lost between `/scan` → `/scan-result` — covered by Task 6 steps (ScanProvider carries `pendingPhoto`/`scanResult`).
5. `DEV_PREVIEW` left enabled leaking a dev screen — Task 5 ends with the flag verified `false`.

## File Structure

New files (created in Tasks 1–6):

- `src/app/_layout.js` — root providers + `<Stack>` + `<RouteGuard/>` + `<ScanProvider>`.
- `src/app/index.js` — entry gate (+ `DEV_PREVIEW` early return).
- `src/app/welcome.js`, `login.js`, `register.js`, `verify.js`, `forgot.js` — thin, render feature screens.
- `src/app/(onboarding)/_layout.js` — `OnboardingProvider` + `FadeStep`.
- `src/app/(onboarding)/` + 10 step routes (`gender.js`, `plan-intro.js`, `birthday.js`, `current-weight.js`, `activity.js`, `target-weight.js`, `height.js`, `great-choice.js`, `nutrition-plan.js`, `paywall.js`) — thin, wire `router.push/back`.
- `src/app/(tabs)/_layout.js` — tab shell (meals/weights/scan/sheets/splash state moved from App).
- `src/app/(tabs)/` + `dashboard.js`, `log.js`, `history.js`, `profile.js` — thin.
- `src/app/scan.js`, `src/app/scan-result.js` — modal routes.
- `src/features/auth/session.js` — `AuthSessionProvider` + `useSession()` (token boot, fetchMe, resume gate, all auth handlers, `refreshUser`, `logout`).
- `src/features/onboarding/steps.js` — `ORDER` array + `nextOf(step)` (replaces `STEPS` + index math; back navigation uses `router.back()`, so no prev-helper is needed).
- `src/features/onboarding/FadeStep.js` — moved as-is from `OnboardingWizard.js`.
- `src/features/onboarding/OnboardingContext.js` — moved as-is.
- `src/features/scan/ScanContext.js` — `ScanProvider` + `useScan()` (`pendingPhoto`, `scanResult`, setters).
- Moved as-is: `src/screens/*` → `src/features/*/screens/*`; `src/components/auth|ui|dashboard/*` → `src/shared/components/*/ *`; `SplashOverlay.js`, `WeightChart.js`, `WeightLogSheet.js` → `src/shared/components/`; `src/theme/` → `src/shared/theme/`; `src/utils/` → `src/shared/utils/`; root `lib/api.js` + `src/lib/*` → `src/shared/lib/`.

Deleted in Task 5: root `index.js`, `App.js`, `src/screens/AuthScreen.legacy.js`.

Import rewrites on move (mechanical): a screen at `src/features/onboarding/screens/X.js` reaches shared code via `../../../shared/...`; `BottomCTA.js` keeps `../../theme/tokens.js` (now `src/shared/theme/tokens.js`) unchanged relatively. `tailwind.config.js` globs already cover `src/app/**` — no config change.

---

### Task 1: Router dependency

**Files:**
- Modify: `package.json`, `package-lock.json` (via installer only)

**Interfaces:**
- Consumes: nothing.
- Produces: `expo-router` + SDK-57 peers (`react-native-screens`, `react-native-gesture-handler`, `react-native-safe-area-context` already present) available for import.

- [ ] **Step 1: Install the router**
  Run: `npx expo install expo-router`
  Expected: success, `package.json` gains `expo-router` (SDK-57 line).
- [ ] **Step 2: Lint**
  Run: `npx expo lint`
  Expected: 0 errors (3 pre-existing warnings in `PictureUploadScreen`/`ScanResultScreen` only).
- [ ] **Step 3: Boot unchanged**
  Run: `npx expo start`, reload Expo Go from a closed app.
  Expected: welcome screen exactly as before (`main` still points at old `index.js`).
- [ ] **Step 4: Commit**
  Run: `git add package.json package-lock.json`
  Run: `git commit -m "chore: add expo-router dependency (entry flip later)"`

---

### Task 2: Extract auth session module (App.js shrinks, still boots)

**Files:**
- Create: `src/features/auth/session.js`
- Modify: `App.js` (replace auth state + boot effect + handlers, approx lines 35–113 and 221–310, with the hook call)

**Interfaces:**
- Consumes: `getToken`/`setToken`/`setSessionExpiredHandler` from `src/lib/tokenStore`; `login/register/verifyEmail/resendCode/skipVerification/fetchMe` from `src/lib/authApi`; `toastSuccess/toastError` from `src/utils/toast`.
- Produces: `AuthSessionProvider` (wraps children, no UI) and `useSession()` returning `{ user, setUser, authChecked, authStage, setAuthStage, stageEmail, setStageEmail, verifyNext, authBusy, goal, setGoal, handleLogin, handleRegister, handleVerify, handleResend, handleSkip, handleLogout, refreshUser }`. `handleLogout()` = `await logout()` then `setUser(null)`. `refreshUser()` = `fetchMe()` then `setUser(data.user)` (used by paywall completion later). All logic moved verbatim, including `resumeOnboardingIfNeeded` and the `DEV_PREVIEW_GENDER` early-return export.

- [ ] **Step 1: Create `src/features/auth/session.js` with the provider + hook**
  Move (do not rewrite): `authStage/stageEmail/verifyNext/authBusy` state, `resumeOnboardingIfNeeded`, boot effect (`getToken → fetchMe → gate`), session-expired effect, and all six handlers. `user/authChecked/goal` state also moves here; `loadWeek` stays in `App.js` reading `auth.user`.
- [ ] **Step 2: Rewire `App.js` to the hook**
  Replace the moved blocks with `const auth = useAuthSession();` inside an `AuthSessionProvider` wrapper at the top of the file's render (provider must wrap the component that calls the hook — split `App` into outer provider + inner `AppShell`). Keep every prop passed to screens identical.
- [ ] **Step 3: Lint**
  Run: `npx expo lint`
  Expected: 0 errors.
- [ ] **Step 4: Boot all three session states**
  Cold boot with no token → welcome. Login with a completed account → dashboard. Login with an incomplete account → gender step (resume gate). Reload from a closed app each time.
  Expected: identical to pre-task behavior.
- [ ] **Step 5: Commit**
  Run: `git add src/features/auth/session.js App.js`
  Run: `git commit -m "refactor: extract auth session from App into features/auth"`

---

### Task 3: Move shared primitives to `shared/` (no rewrites)

**Files:**
- Create (move as-is): `src/shared/components/auth/*` (9 files), `src/shared/components/ui/*` (11 files), `src/shared/components/dashboard/*` (2 files), `src/shared/components/SplashOverlay.js`, `src/shared/components/WeightChart.js`, `src/shared/components/WeightLogSheet.js`, `src/shared/theme/tokens.js`, `src/shared/utils/*` (5 files), `src/shared/lib/api.js` + `src/shared/lib/authApi.js|mealsApi.js|scanApi.js|tokenStore.js|useIsOnline.js|weightsApi.js`.
- Modify: every importer (screens, `App.js`, cross-component imports) to the new relative paths.
- Delete: the old locations.

**Interfaces:**
- Consumes: nothing new.
- Produces: identical module contents at stable `shared/` addresses; every other file imports from there.

- [ ] **Step 1: Move the files with `git mv` (keeps history)**
  Run (from repo root): `git mv src/components/auth src/shared/components/auth` — actually create dirs first:
  Run: `New-Item -ItemType Directory -Path "src/shared/components", "src/shared/theme", "src/shared/utils", "src/shared/lib"`
  Then `git mv` each file per the list above.
- [ ] **Step 2: Rewrite import paths**
  In every file under `src/screens`, `App.js`, and moved components: `../../components/auth/X` → `../../shared/components/auth/X` (adjust depth per file: screens sit one deeper than before relative to shared — verify each with grep). `../../../lib/api` → `../../shared/lib/api`. `../../theme/tokens` → `../../shared/theme/tokens` (same depth, path text changes only in dir name).
  Verify: `grep -rn "from ['\"]\.\./\.\./components" src App.js` returns nothing; `grep -rn "from ['\"]\.\./\.\./\.\./lib/api" src` returns nothing.
- [ ] **Step 3: Lint**
  Run: `npx expo lint`
  Expected: 0 errors.
- [ ] **Step 4: Boot + tap one screen per area**
  Reload from closed app; open welcome → register whitescreen check; start onboarding to gender (OptionCard renders = shared import good); dashboard tab renders (shared ui good).
  Expected: no red screens, visuals identical.
- [ ] **Step 5: Commit**
  Run: `git add -A`
  Run: `git commit -m "refactor: move shared primitives under src/shared (no rewrites)"`

---

### Task 4: Move screens to `features/*/screens/` (old entry still boots)

**Files:**
- Create (move as-is): `src/features/auth/screens/` ← `WelcomeScreen, LoginScreen, RegisterScreen, VerifyScreen, ForgotScreen`; `src/features/onboarding/screens/` ← 10 step screens + move `OnboardingContext.js`, `FadeStep` (extract from `OnboardingWizard.js` to `src/features/onboarding/FadeStep.js`), add `src/features/onboarding/steps.js` (`ORDER`, `nextOf` — transcribed from `STEPS` + index math, no behavior change; back navigation uses `router.back()`); `src/features/dashboard/screens/` ← `DashboardScreen`; `src/features/meals/screens/` ← `LogFoodScreen`; `src/features/progress/screens/` ← `ProgressScreen, ProfileScreen`; `src/features/scan/screens/` ← `PictureUploadScreen, ScanResultScreen`.
- Modify: `App.js`, `OnboardingWizard.js`, cross-screen imports to new paths.
- Delete: old `src/screens/*` files (via `git mv`), `AuthScreen.legacy.js` stays until Task 5.

**Interfaces:**
- Consumes: `shared/` modules from Task 3.
- Produces: screens at feature addresses with identical props/exports; `steps.js` exports `ORDER` (the 10 keys in wizard order) and `nextOf(step)`.

- [ ] **Step 1: Move screen files with `git mv` + fix imports**
  Same import-depth procedure as Task 3. A screen at `src/features/onboarding/screens/X.js` reaches shared code via `../../../shared/...` and context via `../OnboardingContext`.
- [ ] **Step 2: Extract `FadeStep`, add `steps.js` (no callers yet)**
  `FadeStep` copied verbatim from `OnboardingWizard.js`; `steps.js` transcribes `STEPS` order. Wire nothing — Task 5 consumes them.
- [ ] **Step 3: Lint**
  Run: `npx expo lint`
  Expected: 0 errors.
- [ ] **Step 4: Full tap-through on old entry**
  Reload from closed app: register → verify → all 10 onboarding steps → plan → paywall → tabs; back on every screen.
  Expected: identical behavior (entry is still old `App.js`).
- [ ] **Step 5: Commit**
  Run: `git add -A`
  Run: `git commit -m "refactor: colocate screens under features (routes next)"`

---

### Task 5: Router layouts, gate, entry flip (the cutover)

**Files:**
- Create: `src/app/_layout.js`, `src/app/index.js`, `src/app/welcome.js|login.js|register.js|verify.js|forgot.js`, `src/app/(onboarding)/_layout.js` + 10 step routes, `src/app/(tabs)/_layout.js`, `src/app/(tabs)/dashboard.js|log.js|history.js|profile.js`, `src/app/scan.js`, `src/app/scan-result.js`, `src/features/scan/ScanContext.js`.
- Modify: `package.json` (`main` → `expo-router/entry`); step screens swap `onNext/onBack/onDone` props for `router.push/back` using `nextOf` (gender back-0 keeps exit→logout→welcome); `BottomNav` active derived via `useSegments` in the tab layout (component itself unchanged); paywall completion calls `refreshUser()` then `replace('/(tabs)/dashboard')`; verify back keeps `verifyNext` routing (register/login) via session.
- Delete: root `index.js`, `App.js`, `src/screens/AuthScreen.legacy.js`.

**Interfaces:**
- Consumes: `useSession()` (+ setters), `OnboardingProvider`, `FadeStep` (keyed by `usePathname()`), `ScanProvider`, `ORDER/nextOf`.
- Produces: working route tree; `RouteGuard` rule — redirect only when the current group mismatches the session (no-token on protected group → `/welcome`; incomplete on tabs group → `/(onboarding)/gender`; completed on auth/onboarding groups → `/(tabs)/dashboard`).

- [ ] **Step 1: Write layouts + gate + auth routes**
  Root `_layout.js`: `SafeAreaProvider > AuthSessionProvider > ScanProvider > Stack + RouteGuard + ThemedToast`, with `RouteGuard` defined inline in the same file (reads `useSegments()` + session, replaces route only when the current group mismatches). `index.js`: `DEV_PREVIEW` return (moved flag), then `!authChecked → null`, then the three `Redirect`s. Five auth routes render feature screens with session handlers.
- [ ] **Step 2: Write onboarding group**
  Group layout provides `OnboardingProvider email={stageEmail}` + `FadeStep stepKey={usePathname()}` + `<Slot/>`. Each step route: `onNext={() => push(nextOf('gender'))}` etc.; gender `onBack` → `handleLogout()` + `replace('/welcome')`; others `router.back()`; nutrition-plan finish unchanged then `push` paywall; paywall `onDone` → `refreshUser()` + `replace('/(tabs)/dashboard')`.
- [ ] **Step 3: Write tab shell + scan modals**
  Move meals/weights/scan/sheets/splash state + effects from old `App.js` into `(tabs)/_layout.js`; `BottomNav active` from `useSegments()`; sheet components unchanged; `scan.js`/`scan-result.js` as modal `Stack.Screen`s reading `useScan()`.
- [ ] **Step 4: Flip entry, delete old shell**
  Set `package.json` main to `expo-router/entry`; delete root `index.js`, `App.js`, `AuthScreen.legacy.js`.
- [ ] **Step 5: Lint**
  Run: `npx expo lint`
  Expected: 0 errors.
- [ ] **Step 6: Verify the three boot states + DEV_PREVIEW**
  No token → `/welcome`; completed → dashboard; incomplete → gender; `DEV_PREVIEW` true → isolated screen. Reload from a closed app every time. Confirm `DEV_PREVIEW` is `false` afterward.
- [ ] **Step 7: Commit**
  Run: `git add -A`
  Run: `git commit -m "refactor: cut over to expo-router entry, delete legacy App shell"`

---

### Task 6: Full verification + closeout

**Files:**
- Modify: none expected (fix-only if the checklist finds anything).

**Interfaces:**
- Consumes: the finished tree.
- Produces: signed-off checklist.

- [ ] **Step 1: Spec §8 checklist end-to-end**
  Run items 2–5: three boot states; full tap-through register → verify → 10 steps → plan → paywall → tabs with back on every screen (verify → register and verify → login both); typed `/login` and `/(onboarding)/birthday` respect guards; scan photo survives `/scan` → `/scan-result` → save.
  Expected: every item behaves exactly as the pre-migration app.
- [ ] **Step 2: Lint + backend tests untouched**
  Run: `npx expo lint` (expect 0 errors); in `caly-ai-backend` run `npm test` (expect green, unchanged).
- [ ] **Step 3: Commit any fixups (or empty)**
  If walkthrough found fixes: `git add -A`, `git commit -m "fix: post-migration walkthrough corrections"`. Otherwise record "no changes needed" and finish.
