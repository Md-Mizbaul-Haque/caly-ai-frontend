# Caly AI – Full RNR Migration + Custom Theme (f2470c) – Design

Date: 2026-10-05
Path: Architectural (full-platform migration)
Approach selected: Full rewrite at once (user-selected over Adapter recommendation)

## 1. Intent (agreed)

- Outcome: whole `caly-ai-frontend` uses React Native Reusables primitives, no custom Button/Card Chip duplicates.
- Custom theme: single source `f2470c` (HSL 15 91% 50%), light + dark, synced across `global.css` / `tailwind.config.js` / `lib/theme.ts`.
- Success: `doctor` passes, `tsc --noEmit` clean, `eslint` clean on touched files, Expo Router screens render with brand styling, no `src/shared/components/ui/*` legacy imports remain.

What user said vs assumptions:
- Said: replace all custom UI, keep f2470c, everything at once.
- Assumed + confirmed: delete legacy UI after migration, keep `rounded-card/btn`, `ink/cream/success` utilities for existing layouts, keep `src/app` routing unchanged.

## 2. Context inventory

- Routes: `src/app/_layout.tsx` (now with `PortalHost`), `(tabs)/`, `(onboarding)/`, `login/register/verify/forgot/welcome/index`.
- Legacy UI (12 files): `Button.js` (PrimaryButton), `Card.js`, `Chip.js`, `BottomNav.js`, `MacroBar.js`, `MacroCard.js`, `ProgressRing.js`, `EmptyState.js`, `icons.js`, `QuickLogSheet.js`, `ThemedToast.js`, `OfflineBanner.js` + auth (`AuthInput`, `AuthScaffold`, `BottomCTA`, `OptionCard`, `PasswordInput`, `RulerSlider`, `UnitToggle`, `WheelPicker`) + dashboard (`MealRow`, `DaySelector`) + `WeightChart`, `WeightLogSheet`, `SplashOverlay`.
- Usage: 26+ imports from `shared/components/ui` across Dashboard, Progress, LogFood, Scan, tabs layout.
- Theme split: `src/shared/theme/tokens.js` primary `#FF6B35` vs `lib/theme.ts` / `global.css` primary `f2470c`. Tailwind already maps `hsl(var(--...))` + preserves `ink/cream/success`.
- Infra ready: `metro.config.js` `inlineRem:16`, `components.json` aliases `@/lib/utils`, `@/components/ui`, `tsconfig` `@/*`, `lib/utils.ts` `cn()`, `@rn-primitives/portal`.

## 3. Architecture

- Install via CLI into canonical paths, not `src/shared`:
  - `npx @react-native-reusables/cli add button card badge input textarea text label avatar progress dialog sheet sonner separator skeleton switch -y --cwd caly-ai-frontend`
  - Output: `components/ui/*`, uses `@/lib/utils` (`lib/utils.ts`) + `@/lib/theme`? CLI uses `lib/theme` pattern; keep `lib/theme.ts`.
- Aliases: keep `tsconfig` `@/* -> ./*`, `components.json` unchanged. Update `babel`? Expo 57 resolves `tsconfig.paths` for Metro; no `module-resolver` needed unless runtime `@` import fails – fallback: add `babel-plugin-module-resolver` if bundler errors.
- Providers: `src/app/_layout.tsx` stays root, `PortalHost` last, add `ThemeProvider` with `NAV_THEME` if RNR `Text`/`Button` requires theme context (verify per component README).
- No dual `app/` + `src/app/` – keep `src/app` only.
- JS + TSX mix allowed: screens stay `.js`, new RNR are `.tsx`/`.ts`, `_layout.tsx` has `// @ts-nocheck` to preserve JS behavior.

## 4. Components mapping (full rewrite)

- `PrimaryButton` (`Button.js`) -> RNR `button` + `text` (`@/components/ui/button`, `@/components/ui/text`), variants: default `bg-primary`, disabled `bg-muted`, `rounded-btn`.
- `Card.js` -> RNR `card` (`Card`, `CardContent`), keep `rounded-card border-border`.
- `Chip.js` -> RNR `badge`, active `bg-primary`, inactive `bg-white border`.
- `AuthInput`, `PasswordInput` -> RNR `input` + `label`, preserve secure entry, error `text-destructive`.
- `OptionCard`, `BottomCTA`, `UnitToggle` -> RNR `button`/`badge` + `text`, keep press states.
- `ProgressRing`, `MacroBar`, `WeightChart` visuals -> RNR `progress` for bars, keep `react-native-svg` for rings/charts (RNR has no chart).
- `QuickLogSheet`, `WeightLogSheet` -> RNR `sheet` / `dialog` (requires `PortalHost` – done).
- `ThemedToast`, `OfflineBanner` -> RNR `sonner` (native toast) or keep wrapper around `react-native-toast-message` if sonner web-only – decide during implementation by testing on Expo Go.
- `BottomNav` -> keep Expo Router native tabs (`navigation-native-navigators` rule), style with `text-primary` / `text-muted`, do not replace with JS tabs.
- `icons.js` (custom) -> `lucide-react-native` (already dep) + RNR `iconWithClassName`.
- Delete after migration: `src/shared/components/ui/Button|Card|Chip|Macro*|ProgressRing|EmptyState|QuickLogSheet|ThemedToast` once zero imports. Keep `OfflineBanner`, `BottomNav` shell if still needed as layout, but restyle with `cn()` + theme vars.
- All class strings via `cn()`, no inline hex except `f2470c` fallback during transition.

## 5. Theme unification (f2470c single source)

- Source: `lib/theme.ts` `THEME.light.primary = hsl(15 91% 50%)`, `THEME.dark.primary` same.
- `global.css`: `:root` + `.dark:root` HSL already set, `--radius:1.375rem` (22px/16), `--font-sans/serif/mono` preserved.
- `tailwind.config.js`: `colors.* DEFAULT/Foreground` from `hsl(var(--...))`, keep `ink/cream/success`, `borderRadius.card/btn` from `tokens.radii`, `hairlineWidth`, `accordion` keyframes, `tailwindcss-animate`.
- `src/shared/theme/tokens.js`: deprecate – re-export from `lib/theme` or change `primary:'#FF6B35'` -> `'#f2470c'`, `primaryDark:'#E85A24'` stays for pressed, keep `radii/spacing/shadows/type` (used by non-RNR layout). No dual primaries after.
- Dark mode: keep `.dark:root` vars + `NAV_THEME`, but app `userInterfaceStyle:light` + `SafeAreaView bg-white` stays light-first; add `useColorScheme` + `ThemeProvider` only if RNR components require it, default light.

## 6. Data flow, error handling, testing

- Data flow unchanged: screens -> `shared/lib/*Api` -> `AuthSessionProvider`, only UI layer swapped.
- Errors: missing RNR dep -> `npx expo install`, missing alias -> check `tsconfig` + restart Metro `--clear`, Portal-related invisible Dialog/Sheet -> verify `PortalHost` last child, theme mismatch (white on white) -> verify `global.css` loaded in `_layout`.
- Verify:
  - `npx @react-native-reusables/cli doctor --cwd caly-ai-frontend` – must stay `All checks passed`.
  - `npx tsc --noEmit` – clean (new `.tsx` must not introduce `noImplicitAny` errors; use `// @ts-nocheck` for migrated JS screens if needed short-term).
  - `npx eslint <touched>` – clean; pre-existing `(tabs)/_layout.js:54,86` errors out of scope.
  - `npx expo start --clear` smoke: welcome/login/dashboard/log/progress render, Button/Card/Badge press, Sheet/Dialog open via Portal, Toast shows.
- Rollback: keep git branch, legacy UI deletion is last commit, can revert single component mapping.

## 7. Out of scope

- No backend changes, no new screens, no navigation restructuring, no font loading changes, no EAS build changes.
- No Uniwind migration – Nativewind stays.
- No custom RNR style variant – `new-york`, `neutral`, `cssVariables:true` stays.

## Self-review

- Placeholders: none – component list, paths, theme values explicit.
- Consistency: `f2470c` everywhere, `src/app` only, CLI paths `components/ui` + `lib/*` match `components.json` + `tsconfig`.
- Scope: single plan – UI layer only, feasible in one implementation plan.
- Ambiguity: Toast lib choice (sonner vs existing) left to implementation probe with Expo Go test – explicitly noted, not vague.
