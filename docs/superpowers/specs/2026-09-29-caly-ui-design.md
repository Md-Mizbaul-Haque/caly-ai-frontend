# Caly AI — UI Design Spec (Token-only transfer from Food Delivery reference)

Date: 2026-09-29
Status: awaiting user review
Approach: B — Token-only + Tracker-native layout
Repo: `caly-ai-frontend` (Expo SDK 57 + NativeWind + React 19)

## 1. Intent / Understanding

- User wants to reuse a Figma Community Food Delivery mobile app (`Food-Free-DeliveryMobileApp--Community-?`, node 1-54) as a **visual reference only**, not its ordering flow.
- Caly AI v1 is a **standard calorie tracker**: Home dashboard + log food + history + profile, with AI estimate via backend when ready.
- Figma link is not accessible (login wall). Design proceeds from typical delivery-kit patterns + user memory. All visual assumptions are isolated in one token file so real hex can be swapped in 1-file change later.
- Frontend scaffold today: `App.js` placeholder, `lib/api.js` with `API_URL` + `apiGet` only, `tailwind.config.js` content covers `./App.js` + `./src/**`. No `expo-router` installed.
- Backend scaffold today: `src/index.js` only, meal routes commented out as TODO. V1 is local-first, API-ready.

Success: user can log a meal and see dashboard ring + history update, styled with delivery-app feel but tracker-correct IA, `expo-doctor` clean.

## 2. What we steal vs what we build

Borrow (tokens only):
- Warm primary orange `#FF6B35` (fallback `#FF7A28` if file uses different orange), ink `#1A1A1A`, muted `#8A8A8A`, cream bg `#FFF8F2`, white cards, success green `#22C55E`, danger `#EF4444`
- Radii: cards 16-20px, chips/pills full, buttons 14px
- Type: bold headings 20-24px, body 14px, caption 12px, system font (no custom font in v1)
- Elevation: soft shadow (iOS shadowOpacity 0.08 / Android elevation 2), bottom tab 4 icons + center FAB
- Spacing scale 4/8/12/16/24, screen padding 16-20

Do NOT copy:
- Restaurant browse, cart, checkout, order-tracking flows
- Food imagery grid, price tags, delivery-time badges

If user's actual Figma uses red primary or different radius, update only `src/theme/tokens.js`.

## 3. Architecture

```
caly-ai-frontend/
  App.js (tab state, no router in v1)
  src/
    theme/tokens.js (colors, radii, spacing, shadows, type)
    components/ui/ (Button, Card, Chip, ProgressRing, MacroBar, EmptyState, ErrorToast)
    screens/ (DashboardScreen, LogFoodScreen, HistoryScreen, ProfileScreen)
    lib/ (existing api.js extended with apiPost, mockMeals.js local store)
  tailwind.config.js (extend theme from tokens.js, add src paths if needed)
```

- Navigation v1: `useState` tab in `App.js` (`dashboard | log | history | profile`). Rationale: `expo-router` not installed, avoids native dep churn. Migrate to expo-router in v2 if deep-linking needed.
- State v1: local `useState` + `mockMeals` array, daily totals derived via `utils/totals.js`. No AsyncStorage in v1 (add in v1.1 if persistence requested).
- Styling: NativeWind `className` + tokens via `tailwind.config.js` extend. No new native libs in v1 to stay Expo Go compatible.

## 4. Screens (tracker-native)

### 4.1 Dashboard (default tab)
- Header: greeting "Hi 👋" + date, avatar circle, like delivery header but no location picker
- Search bar (visual only in v1, filters today's meals): placeholder "Search foods…"
- Calorie hero Card: ProgressRing (eaten / goal / remaining), kcal numbers, subtitle
- MacroBars: protein / carbs / fat (g + progress vs goal)
- Meal sections: Breakfast / Lunch / Dinner / Snacks cards, each row shows name, kcal, time, delete affordance
- FAB "+ Log" (center bottom-tab action) → switches to Log tab

### 4.2 LogFood
- Search input → filters `mockMeals` + "AI estimate" card
- AI card: text input "e.g. 2 eggs + toast" + Button "Estimate" → v1 shows mock estimate (e.g. 320 kcal, P20/C25/F12), wired to `POST /api/meals/estimate` when backend exists
- Manual form: name, kcal, protein, carbs, fat + meal-type Chips + Save
- Recent foods horizontal chips

### 4.3 History
- Week strip (7 day pills, selectable, v1 only today has data, others show EmptyState)
- Day total Card + meal list (reuse Dashboard card)
- EmptyState: "No logs yet" illustration text + CTA to Log

### 4.4 Profile / Goals
- Goal editor: target kcal (number input), weight, activity Chips (Low/Med/High)
- Stats Card: 7-day avg (mock), streak (mock)
- Settings placeholder rows: units, notifications (non-functional v1), API URL display from `EXPO_PUBLIC_API_URL`

## 5. Data flow

- v1 local: `mockMeals = [{id, name, kcal, protein, carbs, fat, mealType, loggedAt}]`
- Add: LogFood → validate → prepend to store → totals recompute → Dashboard + History update
- v2 backend-ready: `apiPost('/api/meals/estimate', {text})`, `apiGet('/api/meals?day=')`, `apiPost('/api/meals')`. `lib/api.js` gets `apiPost` helper with JSON + error throw. No auth in v1.
- Totals: `sum(kcal)`, `remaining = goal - eaten`, clamp ring 0-100%.

## 6. Error handling / Edge cases

- Empty search → show recent + hint, not blank
- Invalid manual entry (empty name, kcal <=0, NaN) → inline red hint, disable Save
- API fail (when wired): ErrorToast "Couldn't estimate — check API_URL" + Retry, fallback to manual form
- No meals: EmptyState, ring at 0%
- Over-goal: ring full + red "X over" label, not crash
- Safe-area + keyboard-avoiding on LogFood, portrait only per `app.json`

## 7. Testing / Verification

- `npx expo-doctor` clean, `npx expo start` loads in Expo Go
- Manual: log meal → ring increments, history shows it, profile goal edit changes remaining
- Layout check Android + iOS (Expo Go), portrait 360x800 baseline
- No unit tests in v1 (logic is trivial sums). Add jest for `totals.js` in v1.1 if requested.

## 8. Out of scope (YAGNI)

- expo-router, AsyncStorage persistence, auth, camera/scan, charts lib, dark mode, custom fonts, backend routes, EAS build. All deferred.

## 9. Token swap note

When user provides real Figma hex/radii screenshots, update only:
- `src/theme/tokens.js` + `tailwind.config.js` extend. No screen changes needed.
