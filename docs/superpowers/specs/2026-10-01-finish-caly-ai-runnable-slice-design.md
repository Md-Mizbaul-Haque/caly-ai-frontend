# Finish Caly AI — Core Runnable Slice — Design

Date: 2026-10-01
Status: Approved (approach A)
Intent: Make Caly AI end-to-end runnable with real backend + real auth. Demo: register → verify → login → scan/log meal → dashboard totals → log weight → set goal → delete.

Non-goals (explicitly out of A): Water/Exercise logs, Voice input, distinct food-label pipeline, meal edit, full api-integration Tasks 2-11 TDD parity.

## 1. Context

- Backend `caly-ai-backend` (Express 5 + Mongoose, `src/app.js` mounts `/api/auth|meals|weights|scan`): boots, DB up, returns 401 without JWT — correct. See `backend-run.log`.
- Frontend `caly-ai-frontend` (Expo SDK 57, `App.js` useState router): `authApi.js` defined with 0 callers, `tokenStore.setSessionExpiredHandler` never wired, `LogFoodScreen.js:32` Estimate disabled, `goal useState(2000)` local-only, `QuickLogSheet` Water/Exercise/Voice are toast-only.

## 2. Architecture

Keep two repos, no structural moves. No new backend services. Frontend adds one screen (`AuthScreen.js`), wires existing libs. Backend changes limited to `package.json` test scripts + one `PUT /weights/goal` return fix.

## 3. Components

### 3.1 Auth + App shell
- New `src/screens/AuthScreen.js`: modes register/login/verify/resend/forgot/reset, calls `src/lib/authApi.js`, persists via `src/lib/tokenStore.js`.
- `App.js`: on mount `fetchMe()`; no token/401 → `AuthScreen`; else tabs. Call `setSessionExpiredHandler(() => showAuth)` once. Files: `App.js:15-16,35,181`, `lib/api.js:33,69`.
- Backend: add `"test": "node --test src/routes/*.test.js"` to `package.json`. No auth logic change.

### 3.2 Meals + Scan
- `LogFoodScreen.js`: delete disabled Estimate (`:32-33`), add protein/carbs/fat numeric inputs, pass through `onSave` (today hardcodes `0,0,0` at `:41`).
- Scan path unchanged (`PictureUploadScreen.js` → `scanApi.scanImage/lookupBarcode` → `ScanResultScreen.js` → `App.js:handleSave`): fix photo passthrough (`App.js:123,173` drop `photo/imageUri`; `MealRow.js:15` expects `imageUrl`).
- Label mode stays mapped to scan. `scanApi.js:13-18` 503 placeholder kept, toast must say "offline placeholder".

### 3.3 Weights, Goals, Dashboard, QuickLog
- Goal: `App.js:35` fetch from `GET /api/auth/me` (`user.dailyGoalKcal`), `ProfileScreen.js:22-25` persist via `PUT /api/auth/profile`. `DashboardScreen.js:15-19` derive macros from goal (P25/C50/F25) instead of `120/250/65`.
- Weights: add delete button calling existing `weightsApi.deleteWeight` (0 usages today). `ProgressScreen.js:138-142` add Retry + RefreshControl.
- Backend fix: `src/routes/weights.routes.js:76` return DB doc, not echo.
- `QuickLogSheet.js:69-70,100-101`: render only Log Food / Scan / Weight. Hide Water/Exercise/Voice/Search.

## 4. Data flow

Auth: `AuthScreen → authApi → tokenStore → api.js Bearer → requireAuth → User` . Meals: `LogFood|ScanResult → mealsApi.createMeal → Mongo Meal → Dashboard calcTotals` . Weights: `WeightLogSheet|Progress → weightsApi → Mongo Weight/WeightGoal` . Goal: `Profile → authApi.updateProfile → User.dailyGoalKcal → Dashboard ring` .

## 5. Error handling

- 401 (except login) → `handleUnauthorized` → AuthScreen. No silent logout.
- 503 db-down / scanning-unavailable → toast, block save except scan placeholder with label.
- 4xx validation → surface server message. `ProgressScreen` error → Retry. No `Coming soon` toasts remain in A scope.

## 6. Testing / Done

- Backend: `node --test` 5/5 pass (`meals.validation.test.js`).
- Frontend: `npx expo-doctor` clean.
- Manual M1-M7: register → verify → login → scan photo → save → dashboard → weight → goal → delete. All persist after reload.
- Commit both repos on current branches (`feat/caly-ui`, `feat/api-integration`), no push without approval. Root debug files untouched.
