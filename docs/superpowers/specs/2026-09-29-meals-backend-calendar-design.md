# Design: Real meal data — backend API + calendar progress rings + header logo removal

Date: 2026-09-29
Status: approved design, pending spec review
Scope: `caly-ai-backend` meals API (no auth) + `caly-ai-frontend` dashboard wiring

## 1. Intent

The dashboard's week strip (`DaySelector`) currently filters in-memory mock meals.
The header shows the app logo next to the "Caly AI" title. The user wants:

1. Header logo removed (title + streak badge stay).
2. The calendar backed by real persisted data from the backend (MongoDB via the
   existing `MONGO_URI`), no mock meals.
3. Every day block in the week strip shows a mini progress ring for that day
   (calories eaten ÷ goal, same math as the main dashboard ring).

Agreed constraints: single user, no login/auth. Goal value stays client-side
(`App.js` state, edited in `ProfileScreen`).

## 2. Backend API (`caly-ai-backend`)

Existing stack: Express 5 (`src/index.js`), Mongoose 9, zod 4. No auth middleware.
New files only; `src/index.js` gains the meals mount (replacing the TODO comment).

### 2.1 `src/models/Meal.js`

Mongoose schema (field set mirrors the mock shape so frontend utils keep working):

| Field      | Type   | Rules                                              |
|------------|--------|----------------------------------------------------|
| name       | String | required, trim, max 120 chars                      |
| kcal       | Number | required, min 0, max 10000                        |
| protein    | Number | default 0, min 0                                   |
| carbs      | Number | default 0, min 0                                   |
| fat        | Number | default 0, min 0                                   |
| mealType   | String | enum `Breakfast Lunch Dinner Snack`, default `Snack` |
| emoji      | String | optional, default `🍽️`                             |
| loggedAt   | Date   | default `Date.now`, index for range queries        |

Timestamps enabled (`createdAt`/`updatedAt`). JSON output maps `_id` → `id`
and strips `__v` so the frontend keeps using `meal.id`.

### 2.2 `src/routes/meals.routes.js` (mounted at `/api/meals`)

- `GET /?from=YYYY-MM-DD&to=YYYY-MM-DD` — meals with   `loggedAt` in
  `[from 00:00, to 23:59:59.999]` server-local time, sorted ascending by
  `loggedAt`. Both params required; invalid/missing → `400 { error }`.
  Response: `{ meals: [...] }`.
  Known limitation: day boundaries use server-local timezone; fine for
  single-user local dev.
- `POST /` — zod-validated body
  (`name` non-empty ≤120, `kcal` > 0 ≤ 10000, macros ≥ 0 optional,
  `mealType` enum optional, `emoji` optional, `loggedAt` ISO string optional
  defaulting to now). Invalid → `400 { error, details }`.
  Response: `201 { meal }`.
- `DELETE /:id` — invalid ObjectId → `400`; not found → `404`;
  success → `200 { deleted: true }`.

No pagination (a week of single-user meals is tens of rows).

### 2.3 Wiring

`src/index.js`: `app.use('/api/meals', require('./routes/meals.routes'))`
in place of the commented TODO mounts. No other backend files change.
Server still boots without `MONGO_URI` (existing behavior); meals endpoints
return `503 { error: 'database unavailable' }` when Mongoose is disconnected.

## 3. Frontend (`caly-ai-frontend`)

### 3.1 Header logo removal (`src/screens/DashboardScreen.js`)

Delete lines 42–44 (the `View` wrapping the `Image` of
`../../assets/splash-logo.png`) and the streak badge block (it renders
`mockStats.streak`, which is deleted in §3.5 and has no backend source yet).
Keep the "Caly AI" `Text`. Remove the now-unused `Image` import. No other
header change.

### 3.2 Data layer — new `src/lib/mealsApi.js`

Built on the existing `lib/api.js` client (`apiGet`/`apiPost`;
add `apiDelete` there):

- `fetchWeek(referenceDate)` — computes the Sun–Sat week containing the
  reference date (same week logic as `DaySelector.buildWeek`), calls
  `GET /api/meals?from=&to=` with `dateKey()` boundaries, returns meals array.
- `createMeal(meal)` — `POST /api/meals`, returns created meal (with `id`).
- `deleteMealById(id)` — `DELETE /api/meals/:id`.

All three throw `Error` with backend message on failure (existing client
convention). `API_URL` comes from `EXPO_PUBLIC_API_URL`, fallback
`http://localhost:5000` (unchanged).

### 3.3 `App.js` data flow

- State: `meals` (init `[]`, was `mockMeals`), plus `loading` and `error`.
- On mount, `fetchWeek(new Date())` loads the current week (the strip has no
  week navigation, so no week-change refetch is needed); refetch after every
  successful save/delete instead of relying solely on optimistic state.
  Show a loading indicator while fetching; on error show retry UI that
  re-runs the fetch (no mock fallback — mocks are deleted).
- `handleSave(meal)` — optimistic prepend with temp id, `POST`, replace with
  server meal on success, roll back + surface error on failure. Keeps existing
  shape `{ id, loggedAt, name, kcal, protein, carbs, fat, mealType, emoji }`.
- `deleteMeal(id)` — optimistic remove, `DELETE`, restore on failure.
- `selectedDate` state stays inside `DashboardScreen` (it only affects local
  filtering). `DashboardScreen` receives `meals`, `goal`, `loading`, `error`,
  `onRetry`, `onAdd`, `onDelete` as props.

### 3.4 `DaySelector` + per-day rings

- Props: existing `selected`/`onSelect` plus `totalsByDate` (map
  `YYYY-MM-DD → { eaten, pct }` computed in `DashboardScreen` with the
  existing `calcTotals` + `dateKey` utils) and `goal`.
- Each day block renders a mini `ProgressRing` (`size` ~36, `strokeWidth` ~4,
  no children) under the date number, fed `eaten`/`goal` for that date.
  Days with no meals show the empty track (0% ring) — same component,
  no special-case artwork.
- Selected/today highlight styles unchanged. Horizontal scroll unchanged.

### 3.5 Mock removal

Delete `src/lib/mockMeals.js` (`mockMeals`, `mockStats`, `estimateMock`)
after the API path works. Consequences handled in the same change:
- Streak badge: removed with the header change (§3.1) since `mockStats.streak`
  has no backend source. Reintroduce when a streak endpoint exists
  (out of scope; do not invent a fake number).
- `LogFoodScreen` AI-estimate card calls `estimateMock` → the Estimate button
  is disabled with label "AI estimate coming soon" until the backend
  `/api/scan` endpoint exists (out of scope). Manual entry stays and POSTs.

## 4. Out of scope

Auth/login, goal persistence, streak calculation, AI estimate endpoint,
month-view calendar, pagination, offline cache, tests beyond manual verification.

## 5. Verification

1. Backend: `npm run dev` boots; `POST` then `GET ?from&to` round-trips a meal;
   `400` on bad body; `404` on unknown id; `503` with no DB.
2. Frontend: `npx expo-doctor` 21/21; dashboard loads week's real meals;
   selecting a day filters; each day block shows a ring matching
   `calcTotals` for that date; log + delete persist across reload;
   error state with retry on backend down; header shows title only.
