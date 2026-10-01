# Caly AI — Full Auth + Meals + AI API Integration Design

Date: 2026-09-29
Status: approved (chat design, awaiting written-spec review)
Approach: A — stateless JWT + Mongoose, graceful offline fallback
Scope: `caly-ai-backend` (new) + `caly-ai-frontend` (wiring)

## 1. Intent / Decisions

- Connect the existing Expo frontend to the existing Express scaffold so meals, goals, and AI estimates are real, with email/password auth.
- Decisions from Q&A: full auth + meals + AI; email/password only (no social); graceful fallback when API unreachable; production-ready + verified locally (no deploy this pass).
- Backend today: deps + `.env` (PORT, MONGO_URI, JWT_SECRET, OPENAI_API_KEY all set) + `/health`, zero routes.
- Frontend today: local-first UI, `lib/api.js` (apiGet/apiPost) unused, no `.env`, no token storage.

Success: curl proves every endpoint incl. one real OpenAI call; frontend boots, signs up/logs in, and round-trips meals/goals against the running API; fallback keeps the app usable when the server is down; `expo-doctor` + bundle export clean; security hardening in place.

## 2. API Contract

All responses JSON. Errors always `{ "error": "message" }`. Bearer token = `Authorization: Bearer <jwt>`.

### Auth (no token)
| Route | Body | Success | Errors |
|---|---|---|---|
| `POST /api/auth/signup` | `{email, password}` | 201 `{token, user:{id,email}}` | 400 zod, 409 duplicate email |
| `POST /api/auth/login` | `{email, password}` | 200 `{token, user:{id,email}}` | 400 zod, 401 bad creds |
| `GET /api/auth/me` | – | 200 `{user:{id,email}}` | 401 missing/invalid token |

Password: min 8 chars (zod). bcrypt cost 10. JWT payload `{sub, email}`, expiry `JWT_EXPIRES_IN` (default `7d`).

### Meals (Bearer)
| Route | Body/Query | Success | Errors |
|---|---|---|---|
| `GET /api/meals` | optional `?day=YYYY-MM-DD` | 200 `{meals:[...]}` newest first, capped 500 | 401 |
| `POST /api/meals` | `{name, kcal, protein, carbs, fat, mealType, emoji?, imageUrl?, loggedAt}` | 201 meal | 400 zod (kcal ≥ 0, macros ≥ 0) |
| `DELETE /api/meals/:id` | – | 204 | 401, 404 not found or not owner |
| `POST /api/meals/estimate` | `{text}` | 200 `{name, kcal, protein, carbs, fat, mealType}` | 400, 401, 502 AI failure, 429 stricter limit |

Timezone rule: client filters by device-local day using existing `dateKey()` on `loggedAt` — server does NOT compute day buckets (no TZ bugs). Optional `day` query exists for future use only.

### Goals (Bearer)
| Route | Body | Success |
|---|---|---|
| `GET /api/goals` | – | 200 `{dailyGoalKcal}` (default 2000 until set) |
| `PUT /api/goals` | `{dailyGoalKcal}` | 200 saved (upsert, zod: 500–20000) |

### Health
`GET /health` → `{status:'ok', db:'up'|'down', uptime}`. Rate-limit and body limits apply to `/api/*` only.

## 3. Backend Architecture

Follows README layout: `src/config, middleware, models, routes, controllers, services`.

```
src/
  index.js            wiring: middleware, routes, 404, error handler, graceful shutdown
  config/db.js        mongoose connect/disconnect helpers
  models/User.js      {email unique, passwordHash} + comparePassword()
  models/Meal.js      {userId ref, name, kcal, protein, carbs, fat, mealType, emoji, imageUrl, loggedAt} + indexes {userId, loggedAt}
  models/Goal.js      {userId unique, dailyGoalKcal}
  middleware/auth.js  verify JWT → req.user; 401 otherwise
  middleware/validate.js  zod parse → 400 {error} or next
  middleware/error.js  AppError(status,msg) → JSON; stacks logged, never returned when NODE_ENV=production
  routes/{auth,meals,goals}.routes.js   → controllers
  controllers/{auth,meals,goals}.controller.js
  services/openai.service.js  Responses API, JSON-only prompt, fence-strip + zod-parse, throws AppError(502)
  utils/AppError.js
```

Model name: `OPENAI_MODEL` env, default chosen and **verified live against the user's key during implementation** (not guessed in spec).

## 4. Frontend Architecture

Deps: add `expo-secure-store` (Expo Go compatible). No other new deps.

```
lib/api.js        + setToken/getToken/clearToken (SecureStore), authFetch() attaches Bearer,
                  throws ApiError{status,message}; 401 → clearToken + re-auth
src/lib/session.js  exports `bootstrap()` (resolves SecureStore token → 'checking'|'auth'|'app') + login/signup/logout helpers
src/screens/AuthScreen.js  login/signup toggle, inline validation, network-error retry
App.js            boot: checking (spinner) → no token ? AuthScreen : tab shell (unchanged tabs)
```

Behavior changes per screen:
- **Dashboard**: fetch all meals once after login (and on tab focus). If fetch fails → keep `mockMeals` in state + `offline` flag → subtle muted "Offline — showing local data" line under header. Day filtering logic unchanged.
- **LogFood**: Estimate → `POST /api/meals/estimate`; on failure fall back to `estimateMock()` + hint. Result card gains an **Apply** button filling name/kcal/macros into the manual form. Save → `POST /api/meals` (optimistic local add regardless; if server rejects, show inline error and keep form values).
- **History**: uses same fetched meals (already prop-driven) — no structural change.
- **Profile**: goal loads via `GET /api/goals`, Save → `PUT` (optimistic, revert + error on failure); shows logged-in email from `/api/auth/me`; **Logout** → `clearToken` → AuthScreen.
- **AuthScreen errors**: wrong password → readable 401 message; server down → "Can't reach server — tap to retry"; no silent failures.

Data flow: single source = `meals`/`goal` state in App.js (lifted as today). Server wins when reachable; local wins when offline. No write queue (explicitly rejected).

## 5. Config / Environments

- Backend `.env.example` += `NODE_ENV`, `JWT_EXPIRES_IN`, `OPENAI_MODEL`, `CORS_ORIGINS` (optional allowlist; default open-without-credentials — correct for Bearer-token APIs).
- Frontend: create `.env` with `EXPO_PUBLIC_API_URL` = machine LAN IP (physical device) — localhost only works in simulators; add `.env` to `.gitignore` (currently only ignores `.env*.local`); update `.env.example` with LAN-IP guidance.
- `NODE_ENV=production` hides stack traces; `TRUST_PROXY=1` env for hosts behind proxies (Render etc.) so rate limiting sees real IPs.

## 6. Production Hardening Checklist

- helmet ✓ (present), rate limit ✓ (present); add stricter sub-limiter on `/api/meals/estimate` (20 req / 15 min).
- zod validation on every body/params; bcrypt; JWT expiry; owner-scoped queries (no IDOR); no secrets in logs/responses; graceful SIGTERM shutdown; centralized 404 + error handler; request body cap stays 10mb.
- `.env` untracked in backend repo (verified); frontend `.env` ignored after change.
- README (backend): endpoint table + run instructions refresh.

## 7. Verification Plan

1. **Backend curl suite**: health (db up) → signup → login → wrong-password 401 → duplicate 409 → malformed body 400 → meals GET/POST/DELETE with token → no-token 401 → second-user delete of first user's meal 404 → goals GET/PUT round-trip → **one real estimate call** (cheap; model confirmed working) → helmet header check → estimate rate-limit sanity.
2. **Mongo**: `/health` reports `db: up` against the provided MONGO_URI.
3. **Frontend**: `npx expo-doctor` clean; `npx expo export --platform ios` bundle succeeds; Metro serves bundle. Click-through (user, 60 s): signup → dashboard shows server meals → log meal → it persists after reload → estimate+Apply → goal save → logout → login again.
4. Evidence before any "done" claim (verification-before-completion).

## 8. Out of Scope

Refresh tokens, email verification, password reset, social login, Cloudinary image upload (deferred), offline write queue, deploy/EAS build, expo-router migration, dark mode.

## 9. Risks

- OpenAI model availability/pricing changes → env-configurable, verified live at implementation.
- LAN IP/firewall blocks device→backend → mitigation: document `ipconfig` check + Windows firewall rule in runbook; simulators use localhost/10.0.2.2.
- Express 5 + mongoose 9 API drift vs training data → code follows installed packages' READMEs, verified by running the curl suite.
