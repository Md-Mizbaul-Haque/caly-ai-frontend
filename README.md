# Caly AI Frontend

Expo (React Native) mobile app for Caly AI: snap or log food, track calories/macros against a daily goal, and track weight. Pairs with `caly-ai-backend`.

## Stack

Expo SDK 57 · React 19 · React Native 0.86 · NativeWind 4 (Tailwind) · `expo-camera` / `expo-image-picker` (scan) · `expo-secure-store` (JWT) · `react-native-svg` (charts) · `reanimated` · `lucide-react-native` icons. No navigation library — `App.js` switches tabs with local state.

## Quick start

```bash
npm install
cp .env.example .env   # EXPO_PUBLIC_API_URL=http://localhost:5000
npx expo start          # scan QR with Expo Go, or press a for Android emulator
```

> On a physical phone, `localhost` is the phone itself — set `EXPO_PUBLIC_API_URL` to your PC's LAN address (e.g. `http://192.168.1.5:5000`) and add it to the backend's `CORS_ORIGINS`.

## Flows

- **Auth gate**: register → 6-digit email code → verify → tabs. Token persists in SecureStore; any `401` returns to sign-in. Goal loads from `GET /api/auth/me`.
- **Dashboard**: week strip, eaten/goal ring, macros derived from goal (P25/C50/F25), today's meals with delete + rollback.
- **Log food**: manual entry with macros; photos attach as `imageUrl` and render in the meal row.
- **Scan**: camera / barcode / food-label / library → editable AI items or product lookup → save as meal. Without a backend vision key you get a clearly labeled placeholder estimate.
- **Progress**: weight chart (90D/6M/1Y/ALL), streaks, daily-average calories, retry on error, delete latest weight.
- **Profile**: daily goal editor (500–10000, persisted via `PUT /api/auth/profile`).

Backend errors surface as toasts; optimistic creates roll back on failure.

## Scripts

`npm start` (dev server) · `android` / `ios` (dev builds) · `web` · `lint` (`expo lint`).

## Structure

`App.js` (tabs, auth gate, optimistic mutations) · `src/screens/` (`Auth,Dashboard,LogFood,Progress,Profile,PictureUpload,ScanResult`) · `src/components/` (`ui/` primitives+`BottomNav`+`QuickLogSheet`, `dashboard/`, `WeightChart`, `WeightLogSheet`) · `src/lib/` (`authApi,mealsApi,weightsApi,scanApi,tokenStore`) · `lib/api.js` (Bearer client) · `src/utils/` (`totals,format,toast`) · `src/theme/tokens.js` · `docs/superpowers/` (specs + plans)
