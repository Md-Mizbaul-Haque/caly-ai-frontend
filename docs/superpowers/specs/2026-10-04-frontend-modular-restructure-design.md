# Frontend Modular Restructure — Design Spec

- Date: 2026-10-04
- Status: approved sections 1–3, pending written-spec review
- Scope: `caly-ai-frontend` only. Backend restructure is a queued follow-up with its own spec cycle.

## 1. Intent

Reorganize the Expo app into small, single-purpose modules so any screen or
component can be found, understood, debugged, and fixed in isolation —
"pick a screen and fix it," like a real-world project. This is a pure
restructure: after it lands, a UI-bug-fixing session follows on a stable base.

Success looks like:

- Every route is a thin file; every screen/component lives somewhere obvious.
- No file over ~150 lines except route layouts composing modules.
- `npx expo lint` clean, app boots and behaves exactly as before.
- A developer unfamiliar with the repo can locate the birthday picker,
  the auth gate, or the tab shell in under a minute.

## 2. Non-goals

- No UI, copy, color, spacing, or navigation-behavior changes.
- No new test infrastructure (explicitly out of scope for this cycle).
- No migration from the custom `BottomNav` to native Tabs.
- No backend changes. No global theme-token changes.
- No deep-linking scheme; in-app routing only.

## 3. Constraints and invariants (must all hold after the cutover)

1. Auth gating identical: no token → auth routes only; token +
   `onboardingCompleted: false` → onboarding group; token + completed → tabs.
2. Back destinations unchanged, including verify → register/login.
3. Onboarding step order (10 steps) and fade transition unchanged.
4. `DEV_PREVIEW` isolated screen preview keeps working.
5. Toast, splash min/max caps, offline banner, sheets behavior unchanged.
6. Expo Go compatible: no native modules beyond what `npx expo install`
   resolves for `expo-router` (screens, gesture-handler, safe-area).
7. JavaScript (no TypeScript migration), NativeWind styling untouched.

## 4. Target structure

```
src/
  app/                        # ROUTES ONLY — thin files, each renders one screen
    _layout.js                # root providers (SafeArea, Toast) + auth guards
    index.js                  # entry gate (replaces the authStage switch)
    welcome | login | register | verify | forgot
    (onboarding)/_layout.js   # OnboardingProvider + fade transition (moved, not rewritten)
    (onboarding)/gender, plan-intro, birthday, current-weight,
                     activity, target-weight, height,
                     great-choice, nutrition-plan, paywall
    (tabs)/_layout.js         # tab shell: BottomNav + sheets + splash (moved, not rewritten)
    (tabs)/dashboard, log, history, profile
    scan, scan-result          # today's overlays become modal routes
  features/
    auth/                     # useAuthSession hook: token boot, fetchMe,
                              # resume-onboarding gate, all auth handlers
    onboarding/               # step order + guards (logic only)
    dashboard/ meals/ progress/ scan/  # today's lib/*Api + screen helpers, colocated
  shared/
    ui/ theme/ lib/ utils/    # today's components/ui, theme, lib/api, utils (moved, not rewritten)
```

Conventions: relative imports as today; no barrel (`index.js`) files except
the router-required `_layout.js` files; `ui/Button.js` stays canonical;
`src/theme/tokens.js` is the only source of design values. Route files hold
no state or effects except redirects — all logic lives in `features/` hooks.

## 5. Route map

| Route | Renders today | Guard |
|---|---|---|
| `/` | `authStage` switch | no token → `/welcome`; incomplete → `/(onboarding)/gender`; complete → `/(tabs)/dashboard` |
| `/welcome`, `/login`, `/register`, `/verify`, `/forgot` | Same screens | reachable only without a completed session |
| `/(onboarding)/*` (10 steps) | `OnboardingWizard` steps | token required; completed users redirected to tabs |
| `/(tabs)/*` (4 tabs) | Tab screens | completed session required |
| `/scan`, `/scan-result` | `PictureUploadScreen`, `ScanResultScreen` overlays | inside tab session; `push`/`back` replace show/dismiss state |

## 6. `App.js` teardown (443 lines → modules, moved verbatim)

| Today's `App.js` block | Destination |
|---|---|
| Boot effect (`getToken → fetchMe → resume gate`) + `authStage/stageEmail/verifyNext/authBusy` state | `features/auth/useAuthSession.js` (new hook) |
| `handleLogin/Register/Verify/Resend/Skip`, `logout`, session-expired handler | Same hook, consumed via context (no prop-drilling change in behavior) |
| `!authChecked → null`, `!user → stage switch` | `app/index.js` gate + `app/_layout.js` guards (`useSegments` redirects) |
| `DEV_PREVIEW_GENDER` early return | `app/index.js`, env-gated (kept) |
| Meals/weights state, `loadWeek`, log/delete handlers, sheets, scan state, `goal` | `(tabs)/_layout.js` + `features/meals/`, `features/progress/` hooks |
| Splash timers + `SplashOverlay` | Tab shell layout (same min/max caps) |
| `BottomNav`, sheets, toasts, banners | Unchanged, rendered by layouts |

## 7. Entry and dependency wiring

- `npx expo install expo-router` (resolves SDK-57 peers: screens, gesture-handler).
- `package.json` main → `expo-router/entry`; root `index.js` removed after cutover.
- Delete `src/screens/AuthScreen.legacy.js` (dead file, approved).
- `app.json`: no change (no scheme; no deep links in scope).

## 8. Verification (no-behavior-change proof)

1. `npx expo lint` — 0 errors; backend `node --test` still green.
2. Cold boot ×3 states: no token → `/welcome`; completed token → dashboard; incomplete token → gender step.
3. Full tap-through: register → verify → 10 onboarding steps → plan → paywall → tabs; back button on every screen including verify → register/login.
4. `DEV_PREVIEW` gender + birthday isolation still render.
5. Typed routes (`/login`, `/(onboarding)/birthday`) respect guards.
6. Reload Expo Go from a clean bundle before judging any screen (stale-bundle confusion bit us before).

## 9. Risks and mitigations

- Stale Expo Go bundle masking regressions → always test from a fresh reload.
- Router peer-dep drift → install strictly via `npx expo install`.
- Scan overlay → modal route is the one structural behavior shift; open/close mapped to `push`/`back` and covered by checklist item 3.

## 10. Next after this spec

- Written-spec review (this document), then the `writing-plans` skill
  produces the implementation plan.
- Backend restructure spec queued as its own cycle afterward.
- Then the UI-bug-fixing session on the stable base.
