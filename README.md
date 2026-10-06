# Caly AI Frontend

Expo (React Native) mobile app for Caly AI: snap or log food, track calories/macros against a daily goal, and track weight. Pairs with `caly-ai-backend`.

## Features

- Email register → 6-digit code → verify → onboarding → tabs
- Dashboard with week strip, eaten/goal ring, and macro breakdown
- Manual food logging + photo meals
- AI food scan (camera / library / barcode / label) with editable results
- Weight chart (90D / 6M / 1Y / ALL), streaks, daily-average calories
- Daily calorie goal editor (500–10000 kcal)
- Optimistic creates with rollback; backend errors surface as toasts

## Stack

Expo SDK 57 · React 19 · React Native 0.86 · Expo Router (file-based routing in `src/app/`) · NativeWind 4 (Tailwind) · `expo-camera` / `expo-image-picker` (scan) · `expo-secure-store` (JWT) · `react-native-svg` (charts) · `reanimated` · `lucide-react-native` icons.

## Prerequisites

- Node.js 20+ and npm
- The backend running (`caly-ai-backend`, default `http://localhost:5000`)
- For physical devices: Expo Go app, or a development build (`expo run:android` / `expo run:ios`, or EAS)
- For emulators: Android Studio emulator or Xcode simulator

## Quick start

```bash
npm install
cp .env.example .env   # EXPO_PUBLIC_API_URL=http://localhost:5000
npx expo start          # scan QR with Expo Go, or press a for Android emulator
```

> On a physical phone, `localhost` is the phone itself — set `EXPO_PUBLIC_API_URL` to your PC's LAN address (e.g. `http://192.168.1.5:5000`) and add it to the backend's `CORS_ORIGINS`.

## Env vars

| Var | Required | What |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | yes | Backend base URL (no trailing `/api`). Example: `http://localhost:5000` for emulator/web, `http://192.168.1.5:5000` for a physical phone on LAN |

See `.env.example`.

## Navigation & data flow

- **Expo Router** for file-based routing in `src/app/` (tabs in `src/app/(tabs)/`, auth/onboarding screens alongside).
- **Tab Shell** (`src/features/tabs/shell.js`) provides shared state and data fetching via `useTabShell()`.
- **Progress Cache**: centralized cache in `src/app/(tabs)/_layout.js` storing `weights`, `weightGoal`, `meals`, and range meals. Updated via background fetches.
- **Screens** consume cached data via `useTabShell()` to avoid work when backgrounded.
- **Real-time updates**: UI updates automatically when cache changes; pull-to-refresh triggers manual refresh.
- **Performance**: optimized computations with `useMemo`, O(n) totals-by-date calculation.

## Flows

- **Auth gate**: register → 6-digit email code → verify → tabs. Token persists in SecureStore; any `401` returns to sign-in. Goal loads from `GET /api/auth/me`.
- **Dashboard**: week strip, eaten/goal ring, macros derived from goal (P25/C50/F25), today's meals with delete + rollback.
- **Log food**: manual entry with macros; photos attach as `imageUrl` and render in the meal row.
- **Scan**: camera / barcode / food-label / library → editable AI items or product lookup → save as meal. Without a backend vision key you get a clearly labeled placeholder estimate.
- **Progress**: weight chart (90D/6M/1Y/ALL), streaks, daily-average calories, retry on error, delete latest weight.
- **Profile / More**: daily goal editor (500–10000, persisted via `PUT /api/auth/profile`), settings, help, and related screens.

Backend errors surface as toasts; optimistic creates roll back on failure.

## Scripts

`npm start` (dev server) · `android` / `ios` (dev builds) · `web` · `lint` (`expo lint`).

```bash
npx expo start          # dev server
npx expo run:android    # local Android dev build
npx expo run:ios        # local iOS dev build (macOS only)
npx expo lint           # lint
npx tsc --noEmit        # typecheck
```

## Structure

- `src/app/` — Expo Router routes (screens). `src/app/(tabs)/_layout.js` is the tab shell + progress cache; `src/app/(tabs)/dashboard.js|history.js|log.js|more.js` are tabs.
- `src/features/` — feature code: `auth/` (session), `dashboard/`, `meals/`, `scan/` (camera + result screens), `progress/`, `onboarding/`, `more/`, `tabs/shell.js`.
- `src/shared/` — reusable code: `components/` (UI primitives, `BottomNav`, `QuickLogSheet`, `WeightChart`, `WeightLogSheet`), `lib/` (`authApi,mealsApi,weightsApi,scanApi,tokenStore,appCache,api.js`), `utils/` (`totals,format,toast`), `theme/tokens.js`.
- `assets/`, `app.json`, `eas.json` — app icon/splash, Expo config, EAS build profiles.
- `docs/` — specs and plans.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| App can't reach API on a physical phone | `localhost` = the phone. Use your PC's LAN IP in `EXPO_PUBLIC_API_URL` (phone + PC on same Wi-Fi) and add it to backend `CORS_ORIGINS`. |
| `401` kicks back to sign-in | Token missing/expired. Sign in again; token is stored in SecureStore. |
| Camera / library does nothing | Native permission denied. Grant camera/photos permission, or rebuild a dev client after adding native modules (`npx expo run:android`). Expo Go only includes its bundled native modules. |
| Scan returns a "placeholder estimate" | Backend has no `GROQ_API_KEY` / `OPENAI_API_KEY`. Add one to the backend `.env`. |
| Incompatible package versions | Run `npx expo install --fix` and `npx expo-doctor`. Always add native packages with `npx expo install <package>`, not plain `npm install`. |

## Build & deploy (EAS)

`eas.json` defines `development`, `preview`, and `production` profiles (project ID in `app.json`).

```bash
npx eas-cli@latest build --profile development   # dev client (internal)
npx eas-cli@latest build --profile preview       # internal preview
npx eas-cli@latest build --profile production    # store build
```

## License

No project license file for app code — the `LICENSE` in this repo is currently the Expo template MIT notice. Add your own `LICENSE` (e.g. proprietary or MIT with your copyright) before public release.
