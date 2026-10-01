# Caly AI — Full Auth + Meals + AI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the Expo frontend to the Express backend with full email/password auth (JWT), persisted meals, per-user goals, and a real OpenAI food-estimate endpoint — production-hardened and verified locally.

**Architecture:** Stateless JWT auth + Mongoose user-scoped models on the backend (Express app split into `app.js` for testability + `index.js` for bootstrap/shutdown). Frontend gains a SecureStore-backed session gate (AuthScreen before tabs), an auth-aware API layer with graceful offline fallback, and per-screen wiring. Tests are zero-dependency Node fetch scripts requiring the app in-process against the real MongoDB.

**Tech Stack:** Backend: Express 5, mongoose 9, zod 4, bcryptjs 3, jsonwebtoken, openai v7 (Responses API), helmet/cors/morgan/express-rate-limit@8. Frontend: Expo SDK 57, NativeWind, expo-secure-store, lucide-react-native.

**Spec:** `caly-ai-frontend/docs/superpowers/specs/2026-09-29-api-integration-design.md`

## Global Constraints

- Every API error body is exactly `{ "error": "message" }` — no other error shape anywhere.
- Auth is Bearer JWT only (no cookies/sessions); bcrypt cost 10; JWT expiry from `JWT_EXPIRES_IN` (default `7d`); password min 8 chars.
- Every meal query/mutation is scoped by `userId` from the token (no IDOR); malformed ObjectIds return 404, never 500.
- Client filters dashboard days via existing `dateKey()` on `loggedAt` (device-local); server `?day=` filter is UTC only; server never computes device-local day buckets.
- `NODE_ENV=production` → stack traces never in responses (logged server-side only).
- Frontend offline rule: API status `0` (unreachable) or `5xx` = graceful fallback (mock/local state + offline hint); `4xx` = surface the server's message, keep the user on the form.
- No new frontend deps except `expo-secure-store`; backend stays CommonJS; frontend stays ES modules + NativeWind classes (tokens only, no new colors).
- Rate limits: `/api/*` 100 req/15min (`API_LIMIT` override), `/api/meals/estimate` `ESTIMATE_LIMIT` (default 20)/15min — both respond with `{ "error": ... }`.
- `EXPO_PUBLIC_API_URL` is the only frontend env var (public by design); no secrets in the frontend repo; backend `.env` stays untracked.
- No `ios/`/`android/` hand-editing. Two separate git repos: commit backend files only in `caly-ai-backend/`, frontend files only in `caly-ai-frontend/`.

## Review Focus

1. **Duplicate-email signup** must return 409 `{error}` (not a Mongo dump 500) → pinned in Task 2 (`test-auth.js`: signup same email twice).
2. **Cross-user meal delete and malformed IDs** must return 404 (no IDOR, no CastError 500) → pinned in Task 3 (`test-meals.js`: B deletes A's meal; delete `notanid`).
3. **DB outage** must fail fast with 503 `{error}` (not hang on mongoose buffering) and `/health` must say `db:'down'` → pinned in Task 3 (disconnect DB mid-script, assert <2s).
4. **AI outage / bad model** must return 502 `{error}` quickly, never crash or leak the key → pinned in Task 4 (`test-estimate.js` forces an invalid `OPENAI_MODEL`, asserts 502).
5. **Server unreachable from the phone** (status 0) must never crash the app: AuthScreen shows retry, dashboard falls back to mock with an offline hint, logging still works locally → pinned in Tasks 7–9 code + manual checks M1–M4 in Task 11.

## File Structure

```
caly-ai-backend/
  src/
    app.js            NEW — express app, middleware, mounts, error handlers; exports app; no listen/db
    index.js          REWRITE — dotenv, connectDb, listen, graceful shutdown
    config/db.js      NEW — connectDb / disconnectDb / dbUp / assertDbUp
    utils/AppError.js NEW
    middleware/auth.js validate.js error.js NEW
    models/User.js Meal.js Goal.js NEW
    controllers/auth.js meals.js goals.js estimates.js NEW
    routes/auth.js meals.js goals.js NEW
    services/openai.service.js NEW
  scripts/
    helpers.js                NEW — assert/req/json/runSuite shared by all tests
    test-core.js test-auth.js test-meals.js test-goals.js test-estimate.js NEW
caly-ai-frontend/
  lib/api.js          REWRITE — SecureStore token + authFetch + ApiError + unauthorized handler
  src/lib/session.js  NEW — bootstrap / login / signup / logout
  src/screens/AuthScreen.js NEW
  src/screens/DashboardScreen.js LogFoodScreen.js ProfileScreen.js MODIFY
  App.js              REWRITE — session gate + data load + async save contract
  .env NEW, .gitignore MODIFY, .env.example MODIFY
```

---

### Task 1: Backend app core — error infra, db config, health, hardening, test harness

**Files:**
- Create: `src/utils/AppError.js`, `src/middleware/error.js`, `src/middleware/validate.js`, `src/config/db.js`, `src/app.js`, `scripts/helpers.js`, `scripts/test-core.js`
- Modify: `src/index.js`, `.env.example`

**Interfaces:**
- Consumes: existing `.env` (`PORT`, `MONGO_URI`, `JWT_SECRET`), installed deps.
- Produces: `app` (exported express instance, testable via `app.listen(0)`); `connectDb()/disconnectDb()/dbUp()/assertDbUp()` from `src/config/db.js`; `AppError(status, message)`; `validate(schema)` middleware; `notFound`/`errorHandler`; test harness `assert/req/json/runSuite` from `scripts/helpers.js` — required by Tasks 2–6.

- [ ] **Step 1: Write the failing test**

```js
// scripts/helpers.js
async function req(base, path, opts = {}) {
  const res = await fetch(base + path, opts);
  let body = null;
  try { body = await res.json(); } catch (e) { /* empty body */ }
  return { status: res.status, body, headers: res.headers };
}

function json(method, body, token) {
  return {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  };
}

const results = { passed: 0, failed: 0 };

function assert(cond, name) {
  if (cond) { results.passed++; console.log(`ok - ${name}`); }
  else { results.failed++; console.error(`FAIL - ${name}`); }
}

async function runSuite(fn) {
  const { connectDb, disconnectDb } = require('../src/config/db');
  const app = require('../src/app');
  await connectDb();
  const server = app.listen(0);
  const base = `http://localhost:${server.address().port}`;
  try {
    await fn(base);
  } finally {
    server.close();
    await disconnectDb().catch(() => {});
  }
  console.log(`${results.passed} passed, ${results.failed} failed`);
  process.exit(results.failed ? 1 : 0);
}

module.exports = { req, json, assert, runSuite };
```

```js
// scripts/test-core.js
require('dotenv').config();
process.env.NODE_ENV = 'production';

const { req, json, assert, runSuite } = require('./helpers');

runSuite(async base => {
  const health = await req(base, '/health');
  assert(health.status === 200 && health.body.status === 'ok', 'health returns 200 ok');
  assert(health.body.db === 'up', 'health reports db up');
  assert(typeof health.body.uptime === 'number', 'health includes uptime');

  const missing = await req(base, '/definitely-missing');
  assert(missing.status === 404 && missing.body && missing.body.error, 'unknown route -> 404 {error}');

  const badJson = await req(base, '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{{not json',
  });
  assert(badJson.status === 400 && badJson.body && badJson.body.error === 'Invalid JSON body', 'malformed JSON -> 400 {error}');

  assert(health.headers.get('x-content-type-options') === 'nosniff', 'helmet sets x-content-type-options');

  const { errorHandler } = require('../src/middleware/error');
  let captured = null;
  const fakeRes = {
    status(c) { this.code = c; return this; },
    json(b) { captured = { code: this.code, body: b }; },
  };
  errorHandler(new Error('boom'), {}, fakeRes, () => {});
  assert(captured && captured.code === 500 && captured.body.error === 'boom', 'errorHandler -> 500 {error}');
  assert(!('stack' in captured.body), 'production: no stack in response');
  process.env.NODE_ENV = 'development';
  errorHandler(new Error('boom'), {}, fakeRes, () => {});
  assert('stack' in captured.body, 'development: stack included');
  process.env.NODE_ENV = 'production';

  let limited = false;
  for (let i = 0; i < 101 && !limited; i++) {
    const r = await req(base, '/api');
    if (r.status === 429) {
      limited = true;
      assert(r.body && r.body.error, 'rate limited response is {error}');
    }
  }
  assert(limited, 'api rate limit engages within 101 requests');
}).catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/test-core.js` (from `caly-ai-backend/`)
Expected: FAIL — `Cannot find module '../src/config/db'` (or `../src/app`)

- [ ] **Step 3: Write minimal implementation**

```js
// src/utils/AppError.js
class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
module.exports = { AppError };
```

```js
// src/config/db.js
const mongoose = require('mongoose');
const { AppError } = require('../utils/AppError');

async function connectDb() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI not set — see .env.example');
  await mongoose.connect(uri);
}

async function disconnectDb() {
  await mongoose.disconnect();
}

function dbUp() {
  return mongoose.connection.readyState === 1;
}

function assertDbUp() {
  if (!dbUp()) throw new AppError(503, 'Database unavailable');
}

module.exports = { connectDb, disconnectDb, dbUp, assertDbUp };
```

```js
// src/middleware/error.js
function notFound(req, res) {
  res.status(404).json({ error: 'Not found' });
}

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const status = err.status || err.statusCode || 500;
  let message = err.message || 'Internal server error';
  if (err.type === 'entity.parse.failed') message = 'Invalid JSON body';
  if (status >= 500) console.error(err);
  const body = { error: message };
  if (status >= 500 && process.env.NODE_ENV !== 'production') body.stack = err.stack;
  res.status(status).json(body);
}

module.exports = { notFound, errorHandler };
```

```js
// src/middleware/validate.js
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const message = result.error.issues
        .map(i => `${i.path.join('.')}: ${i.message}`)
        .join('; ');
      return res.status(400).json({ error: message || 'Invalid input' });
    }
    req[source] = result.data;
    next();
  };
}
module.exports = { validate };
```

```js
// src/app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { dbUp } = require('./config/db');
const { notFound, errorHandler } = require('./middleware/error');

const app = express();

app.set('trust proxy', process.env.TRUST_PROXY === '1' ? 1 : false);

app.use(helmet());
const corsOptions = process.env.CORS_ORIGINS
  ? { origin: process.env.CORS_ORIGINS.split(',').map(s => s.trim()) }
  : {};
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.API_LIMIT) || 100,
  message: { error: 'Too many requests, please try again later' },
});
app.use('/api', apiLimiter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', db: dbUp() ? 'up' : 'down', uptime: Math.round(process.uptime()) });
});

app.get('/api', (req, res) => {
  res.json({ message: 'Caly AI API v1 - use /health for status' });
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;
```

```js
// src/index.js (rewrite)
require('dotenv').config();
const app = require('./app');
const { connectDb, disconnectDb } = require('./config/db');

const PORT = process.env.PORT || 5000;

async function main() {
  try {
    await connectDb();
    console.log('MongoDB connected');
  } catch (e) {
    console.error('MongoDB connect failed:', e.message);
    console.warn('Continuing without DB — /health reports db:down, /api routes return 503');
  }
  const server = app.listen(PORT, () => console.log(`Caly AI API running on http://localhost:${PORT}`));
  function shutdown(signal) {
    console.log(`${signal} received — shutting down`);
    server.close(async () => {
      await disconnectDb().catch(() => {});
      process.exit(0);
    });
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
main();
```

`.env.example` — append:

```
NODE_ENV=development
TRUST_PROXY=0
CORS_ORIGINS=
API_LIMIT=100
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/test-core.js`
Expected: PASS — every assertion prints `ok - ...`, exit 0. Note: `express-rate-limit@8` uses `limit` (`max` is deprecated); if boot logs an option error, confirm the `limit:` line is present.

- [ ] **Step 5: Commit**

```bash
git add src/app.js src/index.js src/config src/middleware src/utils scripts .env.example
git commit -m "feat(api): app/error/db core with health, rate limit, test harness"
```

---

### Task 2: Auth — User model, signup/login/me, JWT middleware

**Files:**
- Create: `src/models/User.js`, `src/middleware/auth.js`, `src/controllers/auth.controller.js`, `src/routes/auth.routes.js`, `scripts/test-auth.js`
- Modify: `src/app.js` (mount routes), `.env.example`

**Interfaces:**
- Consumes: `AppError`, `validate` (Task 1), test harness (Task 1).
- Produces: `POST /api/auth/signup|login` → `{token, user:{id,email}}`, `GET /api/auth/me` → `{user}`; `requireAuth` middleware setting `req.user = {id, email}` (Tasks 3–5); `User` model with statics `hashPassword` and instance `comparePassword`.

- [ ] **Step 1: Write the failing test**

```js
// scripts/test-auth.js
require('dotenv').config();
process.env.NODE_ENV = 'production';

const { req, json, assert, runSuite } = require('./helpers');
const User = require('../src/models/User');

runSuite(async base => {
  const email = `test-${Date.now()}@example.com`;
  try {
    const weak = await req(base, '/api/auth/signup', json('POST', { email, password: 'short' }));
    assert(weak.status === 400 && weak.body.error, 'weak password -> 400 {error}');

    const badEmail = await req(base, '/api/auth/signup', json('POST', { email: 'not-an-email', password: 'longenough1' }));
    assert(badEmail.status === 400 && badEmail.body.error, 'invalid email -> 400 {error}');

    const signup = await req(base, '/api/auth/signup', json('POST', { email, password: 'longenough1' }));
    assert(signup.status === 201, 'signup -> 201');
    assert(signup.body && typeof signup.body.token === 'string' && signup.body.token.split('.').length === 3, 'signup returns JWT');
    assert(signup.body && signup.body.user && signup.body.user.id && signup.body.user.email === email.toLowerCase(), 'signup returns user {id,email}');
    assert(signup.body && !JSON.stringify(signup.body).includes('passwordHash'), 'signup never leaks passwordHash');

    const dup = await req(base, '/api/auth/signup', json('POST', { email, password: 'longenough1' }));
    assert(dup.status === 409 && dup.body.error, 'duplicate email -> 409 {error}');

    const wrongPw = await req(base, '/api/auth/login', json('POST', { email, password: 'wrongpassword' }));
    assert(wrongPw.status === 401 && wrongPw.body.error, 'wrong password -> 401 {error}');

    const ghost = await req(base, '/api/auth/login', json('POST', { email: `ghost-${Date.now()}@example.com`, password: 'whatever123' }));
    assert(ghost.status === 401 && ghost.body.error, 'unknown email -> 401 (same shape, no enumeration)');

    const login = await req(base, '/api/auth/login', json('POST', { email, password: 'longenough1' }));
    assert(login.status === 200 && login.body.token, 'login -> 200 {token}');

    const token = login.body.token;
    const me = await req(base, '/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
    assert(me.status === 200 && me.body.user.email === email.toLowerCase(), '/me with token -> 200 user');

    const noTok = await req(base, '/api/auth/me');
    assert(noTok.status === 401 && noTok.body.error, '/me without token -> 401 {error}');

    const badTok = await req(base, '/api/auth/me', { headers: { Authorization: 'Bearer abc.def.ghi' } });
    assert(badTok.status === 401 && badTok.body.error, '/me garbage token -> 401 {error}');
  } finally {
    await User.deleteOne({ email }).catch(() => {});
  }
}).catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/test-auth.js`
Expected: FAIL — `Cannot find module '../src/models/User'`

- [ ] **Step 3: Write minimal implementation**

```js
// src/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

userSchema.statics.hashPassword = function (password) {
  return bcrypt.hash(password, 10);
};
userSchema.methods.comparePassword = function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
```

```js
// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const { AppError } = require('../utils/AppError');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(new AppError(401, 'Missing token'));
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch (e) {
    next(new AppError(401, 'Invalid or expired token'));
  }
}
module.exports = { requireAuth };
```

```js
// src/controllers/auth.controller.js
const z = require('zod');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { AppError } = require('../utils/AppError');

const credentialsSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(8, 'must be at least 8 characters').max(128),
});

function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

async function signup(req, res) {
  const { email, password } = req.body;
  const passwordHash = await User.hashPassword(password);
  let user;
  try {
    user = await User.create({ email, passwordHash });
  } catch (e) {
    if (e.code === 11000) throw new AppError(409, 'Email already registered');
    throw e;
  }
  res.status(201).json({ token: signToken(user), user: { id: user.id, email: user.email } });
}

async function login(req, res) {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() });
  const ok = user ? await user.comparePassword(password) : false;
  if (!ok) throw new AppError(401, 'Invalid email or password');
  res.json({ token: signToken(user), user: { id: user.id, email: user.email } });
}

async function me(req, res) {
  res.json({ user: { id: req.user.id, email: req.user.email } });
}

module.exports = { signup, login, me, credentialsSchema };
```

```js
// src/routes/auth.routes.js
const router = require('express').Router();
const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { signup, login, me, credentialsSchema } = require('../controllers/auth.controller');

router.post('/signup', validate(credentialsSchema), signup);
router.post('/login', validate(credentialsSchema), login);
router.get('/me', requireAuth, me);

module.exports = router;
```

In `src/app.js`, add these lines after the `app.get('/api', ...)` route and before `app.use(notFound)` (same placement convention for every route mount in later tasks):

```js
app.use('/api/auth', require('./routes/auth.routes'));
```

`.env.example` — append:

```
JWT_EXPIRES_IN=7d
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/test-auth.js`
Expected: PASS — all assertions `ok - ...`, exit 0. Express 5 forwards async-handler rejections to the error middleware automatically; if a 500 appears, the thrown error is missing `.status`.

- [ ] **Step 5: Commit**

```bash
git add src/models/User.js src/middleware/auth.js src/controllers/auth.controller.js src/routes/auth.routes.js src/app.js scripts/test-auth.js .env.example
git commit -m "feat(api): email/password auth with JWT and validation"
```

---

### Task 3: Meals CRUD — model, owner-scoped routes, db-down guard

**Files:**
- Create: `src/models/Meal.js`, `src/controllers/meals.controller.js`, `src/routes/meals.routes.js`, `scripts/test-meals.js`
- Modify: `src/app.js` (mount routes)

**Interfaces:**
- Consumes: `requireAuth` (Task 2), `AppError`, `validate`, `assertDbUp` (Task 1).
- Produces: `GET /api/meals` → `{meals}` newest first (≤500), `POST /api/meals` → 201 meal, `DELETE /api/meals/:id` → 204/404; meal JSON includes virtual `id`; all three 503 when DB down. Frontend Task 8 consumes these.

- [ ] **Step 1: Write the failing test**

```js
// scripts/test-meals.js
require('dotenv').config();
process.env.NODE_ENV = 'production';

const { req, json, assert, runSuite } = require('./helpers');
const User = require('../src/models/User');
const Meal = require('../src/models/Meal');

runSuite(async base => {
  const stamp = Date.now();
  const emailA = `meals-a-${stamp}@example.com`;
  const emailB = `meals-b-${stamp}@example.com`;
  let idA = null;
  let idB = null;
  try {
    const a = await req(base, '/api/auth/signup', json('POST', { email: emailA, password: 'longenough1' }));
    const b = await req(base, '/api/auth/signup', json('POST', { email: emailB, password: 'longenough1' }));
    const tokenA = a.body.token;
    const tokenB = b.body.token;
    idA = a.body.user.id;
    idB = b.body.user.id;

    const noTok = await req(base, '/api/meals');
    assert(noTok.status === 401 && noTok.body.error, 'list without token -> 401 {error}');

    const empty = await req(base, '/api/meals', { headers: { Authorization: `Bearer ${tokenA}` } });
    assert(empty.status === 200 && Array.isArray(empty.body.meals) && empty.body.meals.length === 0, 'fresh list -> 200 {meals:[]}');

    const created = await req(base, '/api/meals', json('POST', {
      name: 'Alpha Bowl', kcal: 400, protein: 20, carbs: 50, fat: 10,
      mealType: 'Lunch', emoji: 'salad', loggedAt: new Date(Date.now() - 60000).toISOString(),
    }, tokenA));
    assert(created.status === 201 && created.body.id, 'create -> 201 meal with id');
    assert(created.body.userId === idA, 'created meal belongs to requester');
    const alphaId = created.body.id;

    const badKcal = await req(base, '/api/meals', json('POST', {
      name: 'Bad', kcal: -5, loggedAt: new Date().toISOString(),
    }, tokenA));
    assert(badKcal.status === 400 && badKcal.body.error, 'negative kcal -> 400 {error}');

    const stringKcal = await req(base, '/api/meals', json('POST', {
      name: 'Bad', kcal: '400', loggedAt: new Date().toISOString(),
    }, tokenA));
    assert(stringKcal.status === 400 && stringKcal.body.error, 'string kcal -> 400 (zod strict types)');

    await req(base, '/api/meals', json('POST', {
      name: 'Bravo Dinner', kcal: 700, mealType: 'Dinner', loggedAt: new Date().toISOString(),
    }, tokenB));

    const listA = await req(base, '/api/meals', { headers: { Authorization: `Bearer ${tokenA}` } });
    const namesA = listA.body.meals.map(m => m.name);
    assert(namesA.includes('Alpha Bowl') && !namesA.includes('Bravo Dinner'), 'list only returns own meals (tenant isolation)');

    await req(base, '/api/meals', json('POST', {
      name: 'Zeta Newest', kcal: 100, loggedAt: new Date().toISOString(),
    }, tokenA));
    const sorted = await req(base, '/api/meals', { headers: { Authorization: `Bearer ${tokenA}` } });
    assert(sorted.body.meals[0].name === 'Zeta Newest', 'list sorted newest first');

    const today = new Date().toISOString().slice(0, 10);
    const dayList = await req(base, `/api/meals?day=${today}`, { headers: { Authorization: `Bearer ${tokenA}` } });
    assert(dayList.status === 200 && dayList.body.meals.length === sorted.body.meals.length, 'day filter (UTC) returns today meals');
    const otherDay = await req(base, '/api/meals?day=1999-01-01', { headers: { Authorization: `Bearer ${tokenA}` } });
    assert(otherDay.body.meals.length === 0, 'day filter excludes other days');

    const foreign = await req(base, `/api/meals/${alphaId}`, json('DELETE', null, tokenB));
    assert(foreign.status === 404 && foreign.body.error, 'cross-user delete -> 404 (no IDOR)');

    const malformed = await req(base, '/api/meals/notanid', json('DELETE', null, tokenA));
    assert(malformed.status === 404 && malformed.body.error, 'malformed id delete -> 404 (no CastError 500)');

    const deleted = await req(base, `/api/meals/${alphaId}`, json('DELETE', null, tokenA));
    assert(deleted.status === 204, 'own delete -> 204');

    const again = await req(base, `/api/meals/${alphaId}`, json('DELETE', null, tokenA));
    assert(again.status === 404, 'second delete -> 404');

    const listB = await req(base, '/api/meals', { headers: { Authorization: `Bearer ${tokenB}` } });
    idB = listB.body.meals[0].userId;

    await User.deleteOne({ email: emailA });
    await User.deleteOne({ email: emailB });
    await Meal.deleteMany({ $or: [{ userId: idA }, { userId: idB }] });

    const { disconnectDb } = require('../src/config/db');
    await disconnectDb();
    const health = await req(base, '/health');
    assert(health.body.db === 'down', 'health reports db:down after disconnect');
    const t0 = Date.now();
    const down = await req(base, '/api/meals', { headers: { Authorization: `Bearer ${tokenA}` } });
    assert(down.status === 503 && down.body.error, 'list with db down -> 503 {error}');
    assert(Date.now() - t0 < 2000, 'db-down fails fast (<2s), no mongoose buffering hang');
  } finally {
    const { dbUp } = require('../src/config/db');
    if (dbUp()) {
      await User.deleteOne({ email: emailA }).catch(() => {});
      await User.deleteOne({ email: emailB }).catch(() => {});
      if (idA || idB) await Meal.deleteMany({ $or: [{ userId: idA || null }, { userId: idB || null }] }).catch(() => {});
    }
  }
}).catch(e => { console.error(e); process.exit(1); });
```

Note: the db-down block runs before `runSuite`'s own `finally`, which still calls `disconnectDb().catch()` — safe on an already-disconnected mongoose. The guarded cleanup above avoids mongoose's 10s buffering timeout when the suite exits in the disconnected state.

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/test-meals.js`
Expected: FAIL — `Cannot find module '../src/models/Meal'` (or `/api/meals` 404 if only the mount is missing)

- [ ] **Step 3: Write minimal implementation**

```js
// src/models/Meal.js
const mongoose = require('mongoose');

const mealSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    kcal: { type: Number, required: true, min: 0 },
    protein: { type: Number, default: 0, min: 0 },
    carbs: { type: Number, default: 0, min: 0 },
    fat: { type: Number, default: 0, min: 0 },
    mealType: { type: String, enum: ['Breakfast', 'Lunch', 'Dinner', 'Snack'], default: 'Snack' },
    emoji: { type: String, maxlength: 8 },
    imageUrl: { type: String, maxlength: 500 },
    loggedAt: { type: Date, required: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);
mealSchema.index({ userId: 1, loggedAt: -1 });

module.exports = mongoose.models.Meal || mongoose.model('Meal', mealSchema);
```

```js
// src/controllers/meals.controller.js
const z = require('zod');
const mongoose = require('mongoose');
const Meal = require('../models/Meal');
const { AppError } = require('../utils/AppError');
const { assertDbUp } = require('../config/db');

const mealSchema = z.object({
  name: z.string().trim().min(1, 'required').max(120),
  kcal: z.number().min(0).max(20000),
  protein: z.number().min(0).max(2000).default(0),
  carbs: z.number().min(0).max(2000).default(0),
  fat: z.number().min(0).max(2000).default(0),
  mealType: z.enum(['Breakfast', 'Lunch', 'Dinner', 'Snack']).default('Snack'),
  emoji: z.string().max(8).optional(),
  imageUrl: z.string().max(500).url().optional(),
  loggedAt: z.coerce.date(),
});

const dayPattern = /^\d{4}-\d{2}-\d{2}$/;

async function list(req, res) {
  assertDbUp();
  const filter = { userId: req.user.id };
  if (req.query.day && dayPattern.test(req.query.day)) {
    filter.loggedAt = {
      $gte: new Date(`${req.query.day}T00:00:00.000Z`),
      $lte: new Date(`${req.query.day}T23:59:59.999Z`),
    };
  }
  const meals = await Meal.find(filter).sort({ loggedAt: -1 }).limit(500);
  res.json({ meals });
}

async function create(req, res) {
  assertDbUp();
  const meal = await Meal.create({ ...req.body, userId: req.user.id });
  res.status(201).json(meal);
}

async function remove(req, res) {
  assertDbUp();
  if (!mongoose.isValidObjectId(req.params.id)) throw new AppError(404, 'Meal not found');
  const result = await Meal.deleteOne({ _id: req.params.id, userId: req.user.id });
  if (result.deletedCount === 0) throw new AppError(404, 'Meal not found');
  res.status(204).end();
}

module.exports = { list, create, remove, mealSchema };
```

```js
// src/routes/meals.routes.js
const router = require('express').Router();
const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { list, create, remove, mealSchema } = require('../controllers/meals.controller');

router.use(requireAuth);
router.get('/', list);
router.post('/', validate(mealSchema), create);
router.delete('/:id', remove);

module.exports = router;
```

In `src/app.js`, add before `app.use(notFound)`:

```js
app.use('/api/meals', require('./routes/meals.routes'));
```

Note: `list` intentionally uses documents (not `.lean()`) so `toJSON` virtuals give every meal a consistent `id`, matching the create response and the frontend's mock-meal shape.

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/test-meals.js`
Expected: PASS — all assertions `ok - ...`, exit 0, including the `db:down` + fast-503 block at the end.

- [ ] **Step 5: Commit**

```bash
git add src/models/Meal.js src/controllers/meals.controller.js src/routes/meals.routes.js src/app.js scripts/test-meals.js
git commit -m "feat(api): meals CRUD with owner scoping and db-down guard"
```

---

### Task 4: AI estimate endpoint — OpenAI service, strict rate limit

**Files:**
- Create: `src/services/openai.service.js`, `src/controllers/estimates.controller.js`, `scripts/test-estimate.js`
- Modify: `src/routes/meals.routes.js` (add estimate route), `.env` (append — stays untracked), `.env.example`

**Interfaces:**
- Consumes: `requireAuth`, `validate`, `AppError` (Tasks 1–2).
- Produces: `POST /api/meals/estimate {text}` → `{name, kcal, protein, carbs, fat, mealType}`; `estimateFood(text)` service throwing `AppError(502, ...)` on AI/parse failure. Frontend Task 9 consumes the route.

- [ ] **Step 1: Write the failing test**

```js
// scripts/test-estimate.js
require('dotenv').config();
process.env.NODE_ENV = 'production';
process.env.ESTIMATE_LIMIT = '3';

const { req, json, assert, runSuite } = require('./helpers');

runSuite(async base => {
  const signup = await req(base, '/api/auth/signup', json('POST', {
    email: `est-${Date.now()}@example.com`, password: 'longenough1',
  }));
  const token = signup.body.token;

  const noAuth = await req(base, '/api/meals/estimate', json('POST', { text: 'two eggs on toast' }));
  assert(noAuth.status === 401 && noAuth.body.error, 'estimate without token -> 401 (auth runs before limiter)');

  const ok = await req(base, '/api/meals/estimate', json('POST', { text: 'grilled salmon with rice and broccoli' }, token));
  assert(ok.status === 200, `estimate happy path -> 200 (got ${ok.status}: ${ok.body && ok.body.error ? ok.body.error : 'no error field'})`);
  if (ok.status === 200) {
    assert(typeof ok.body.kcal === 'number' && ok.body.kcal > 0, 'estimate kcal is a positive number');
    assert(['Breakfast', 'Lunch', 'Dinner', 'Snack'].includes(ok.body.mealType), 'estimate mealType is valid enum');
    assert(typeof ok.body.protein === 'number' && typeof ok.body.carbs === 'number' && typeof ok.body.fat === 'number', 'estimate macros are numbers');
    assert(typeof ok.body.name === 'string' && ok.body.name.length > 0, 'estimate includes food name');
  }

  const tooShort = await req(base, '/api/meals/estimate', json('POST', { text: 'x' }, token));
  assert(tooShort.status === 400 && tooShort.body.error, 'text too short -> 400 {error} (consumes a limit slot: limiter runs before validate)');

  const realModel = process.env.OPENAI_MODEL;
  process.env.OPENAI_MODEL = 'definitely-not-a-real-model-xyz';
  const aiDown = await req(base, '/api/meals/estimate', json('POST', { text: 'banana' }, token));
  process.env.OPENAI_MODEL = realModel;
  assert(aiDown.status === 502 && aiDown.body.error, 'bad model -> 502 {error} (AI failure never crashes)');

  let sawRateLimit = false;
  for (let i = 0; i < 4 && !sawRateLimit; i++) {
    const r = await req(base, '/api/meals/estimate', json('POST', { text: 'grilled chicken salad' }, token));
    if (r.status === 429) {
      sawRateLimit = true;
      assert(r.body && r.body.error, 'estimate 429 body is {error}');
    }
  }
  assert(sawRateLimit, 'estimate rate limit enforced (ESTIMATE_LIMIT=3: 3 slots already used above)');

  const otherRoute = await req(base, '/api/meals', { headers: { Authorization: `Bearer ${token}` } });
  assert(otherRoute.status === 200, 'other routes still work after estimate failures');
}).catch(e => { console.error(e); process.exit(1); });
```

Run-cost note: ≤3 real OpenAI generations plus one intentional model-not-found call (fast, near-zero cost).

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/test-estimate.js`
Expected: FAIL — `/api/meals/estimate` returns 404 for the happy-path assertion

- [ ] **Step 3: Write minimal implementation**

```js
// src/services/openai.service.js
const OpenAI = require('openai');
const z = require('zod');
const { AppError } = require('../utils/AppError');

const estimateResultSchema = z.object({
  name: z.string().min(1),
  kcal: z.number().min(0),
  protein: z.number().min(0),
  carbs: z.number().min(0),
  fat: z.number().min(0),
  mealType: z.enum(['Breakfast', 'Lunch', 'Dinner', 'Snack']),
});

const INSTRUCTIONS = [
  'You are a nutrition estimator for a calorie-tracking app.',
  'Given a food description, estimate nutrition for one typical serving.',
  'Reply with ONLY a JSON object, no markdown fences, no commentary, exactly:',
  '{"name": string, "kcal": number, "protein": number, "carbs": number, "fat": number, "mealType": "Breakfast"|"Lunch"|"Dinner"|"Snack"}',
  'All values are grams except kcal.',
].join('\n');

function extractJson(text) {
  const cleaned = text.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('no JSON object in model output');
  return JSON.parse(cleaned.slice(start, end + 1));
}

async function estimateFood(text) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  let output;
  try {
    const response = await client.responses.create({ model, instructions: INSTRUCTIONS, input: text });
    output = response.output_text;
  } catch (e) {
    console.error('OpenAI estimate failed:', e.message);
    throw new AppError(502, 'Food estimate is unavailable right now');
  }
  try {
    return estimateResultSchema.parse(extractJson(output));
  } catch (e) {
    console.error('Estimate parse failed:', e.message);
    throw new AppError(502, 'Food estimate returned invalid data');
  }
}

module.exports = { estimateFood };
```

```js
// src/controllers/estimates.controller.js
const z = require('zod');
const { estimateFood } = require('../services/openai.service');

const estimateSchema = z.object({
  text: z.string().trim().min(3, 'describe the food in at least 3 characters').max(500),
});

async function estimate(req, res) {
  const result = await estimateFood(req.body.text);
  res.json(result);
}

module.exports = { estimate, estimateSchema };
```

In `src/routes/meals.routes.js`, add (path `/estimate` vs `/` do not conflict; `router.use(requireAuth)` already covers it):

```js
const rateLimit = require('express-rate-limit');
const { estimate, estimateSchema } = require('../controllers/estimates.controller');

const estimateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.ESTIMATE_LIMIT) || 20,
  message: { error: 'Too many estimate requests, please try again later' },
});

router.post('/estimate', estimateLimiter, validate(estimateSchema), estimate);
```

`.env` — append (file stays untracked):

```
OPENAI_MODEL=gpt-4o-mini
ESTIMATE_LIMIT=20
```

`.env.example` — append the same two lines.

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/test-estimate.js`
Expected: PASS — happy path 200, bad model 502, rate limit 429, exit 0.

**Contingency (only if the happy path fails with an AI-side error — wrong model name or missing/invalid `OPENAI_API_KEY`):**

```powershell
$m = Invoke-RestMethod -Uri https://api.openai.com/v1/models -Headers @{ Authorization = "Bearer $env:OPENAI_API_KEY" }
$m.data.id | Where-Object { $_ -match 'mini|4o|5' } | Select-Object -First 20
```

Pick a small current model, set `OPENAI_MODEL=<name>` in `.env`, re-run `node scripts/test-estimate.js` until 200.

- [ ] **Step 5: Commit**

```bash
git add src/services/openai.service.js src/controllers/estimates.controller.js src/routes/meals.routes.js scripts/test-estimate.js .env.example
git commit -m "feat(api): OpenAI food estimate with validation and strict rate limit"
```

---

### Task 5: Goals endpoints

**Files:**
- Create: `src/models/Goal.js`, `src/controllers/goals.controller.js`, `src/routes/goals.routes.js`, `scripts/test-goals.js`
- Modify: `src/app.js` (mount routes)

**Interfaces:**
- Consumes: `requireAuth`, `validate`, `assertDbUp` (Tasks 1–2).
- Produces: `GET /api/goals` → `{dailyGoalKcal}` (default 2000), `PUT /api/goals {dailyGoalKcal}` (500–20000) → saved. Frontend Task 10 consumes both.

- [ ] **Step 1: Write the failing test**

```js
// scripts/test-goals.js
require('dotenv').config();
process.env.NODE_ENV = 'production';

const { req, json, assert, runSuite } = require('./helpers');
const User = require('../src/models/User');
const Goal = require('../src/models/Goal');

runSuite(async base => {
  const email = `goals-${Date.now()}@example.com`;
  let userId = null;
  try {
    const signup = await req(base, '/api/auth/signup', json('POST', { email, password: 'longenough1' }));
    const token = signup.body.token;
    userId = signup.body.user.id;

    const noTok = await req(base, '/api/goals');
    assert(noTok.status === 401 && noTok.body.error, 'goals without token -> 401 {error}');

    const initial = await req(base, '/api/goals', { headers: { Authorization: `Bearer ${token}` } });
    assert(initial.status === 200 && initial.body.dailyGoalKcal === 2000, 'fresh user goal defaults to 2000');

    const saved = await req(base, '/api/goals', json('PUT', { dailyGoalKcal: 1500 }, token));
    assert(saved.status === 200 && saved.body.dailyGoalKcal === 1500, 'PUT 1500 -> 200 saved');

    const again = await req(base, '/api/goals', { headers: { Authorization: `Bearer ${token}` } });
    assert(again.body.dailyGoalKcal === 1500, 'GET reflects saved goal (persisted)');

    const tooLow = await req(base, '/api/goals', json('PUT', { dailyGoalKcal: 100 }, token));
    assert(tooLow.status === 400 && tooLow.body.error, 'goal 100 -> 400 {error}');

    const tooHigh = await req(base, '/api/goals', json('PUT', { dailyGoalKcal: 99999 }, token));
    assert(tooHigh.status === 400 && tooHigh.body.error, 'goal 99999 -> 400 {error}');

    const wrongType = await req(base, '/api/goals', json('PUT', { dailyGoalKcal: 'lots' }, token));
    assert(wrongType.status === 400 && wrongType.body.error, 'string goal -> 400 {error}');
  } finally {
    await User.deleteOne({ email });
    if (userId) await Goal.deleteOne({ userId });
  }
}).catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/test-goals.js`
Expected: FAIL — `Cannot find module '../src/models/Goal'` (or `/api/goals` 404)

- [ ] **Step 3: Write minimal implementation**

```js
// src/models/Goal.js
const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    dailyGoalKcal: { type: Number, required: true, min: 500, max: 20000, default: 2000 },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Goal || mongoose.model('Goal', goalSchema);
```

```js
// src/controllers/goals.controller.js
const z = require('zod');
const Goal = require('../models/Goal');
const { assertDbUp } = require('../config/db');

const goalSchema = z.object({
  dailyGoalKcal: z.number().min(500, 'must be at least 500').max(20000, 'must be at most 20000'),
});

async function getGoal(req, res) {
  assertDbUp();
  const goal = await Goal.findOne({ userId: req.user.id });
  res.json({ dailyGoalKcal: goal ? goal.dailyGoalKcal : 2000 });
}

async function putGoal(req, res) {
  assertDbUp();
  const goal = await Goal.findOneAndUpdate(
    { userId: req.user.id },
    { $set: { dailyGoalKcal: req.body.dailyGoalKcal } },
    { new: true, upsert: true, runValidators: true }
  );
  res.json({ dailyGoalKcal: goal.dailyGoalKcal });
}

module.exports = { getGoal, putGoal, goalSchema };
```

```js
// src/routes/goals.routes.js
const router = require('express').Router();
const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { getGoal, putGoal, goalSchema } = require('../controllers/goals.controller');

router.use(requireAuth);
router.get('/', getGoal);
router.put('/', validate(goalSchema), putGoal);

module.exports = router;
```

In `src/app.js`, add before `app.use(notFound)`:

```js
app.use('/api/goals', require('./routes/goals.routes'));
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/test-goals.js`
Expected: PASS — all assertions `ok - ...`, exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/models/Goal.js src/controllers/goals.controller.js src/routes/goals.routes.js src/app.js scripts/test-goals.js
git commit -m "feat(api): per-user daily goal get/upsert with validation"
```

---

### Task 6: Backend docs + full suite

**Files:**
- Modify: `README.md`, `package.json`

**Interfaces:**
- Consumes: Tasks 1–5 deliverables.
- Produces: `npm test` running the whole suite; README endpoint/env reference for whoever deploys later.

- [ ] **Step 1: Add npm test script**

In `package.json` scripts add:

```json
"test": "node scripts/test-core.js && node scripts/test-auth.js && node scripts/test-meals.js && node scripts/test-goals.js && node scripts/test-estimate.js"
```

- [ ] **Step 2: Run full suite**

Run: `npm test`
Expected: all five scripts print `N passed, 0 failed`, final exit 0. (`test-estimate` makes ≤3 real OpenAI calls.)

- [ ] **Step 3: Update README**

Replace `README.md` with:

````markdown
# Caly AI Backend

Express + MongoDB + OpenAI calorie-tracking API (JWT auth).

## Quick start
```bash
cp .env.example .env   # then fill values
npm install
npm run dev            # nodemon, http://localhost:5000
npm test               # full API suite (needs valid MONGO_URI + OPENAI_API_KEY)
```

## Endpoints
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | /health | – | `{status, db:'up'|'down', uptime}` |
| POST | /api/auth/signup | – | `{email,password}` → `{token,user}` (409 duplicate) |
| POST | /api/auth/login | – | → `{token,user}` (401 bad creds) |
| GET | /api/auth/me | Bearer | current user |
| GET | /api/meals | Bearer | `?day=YYYY-MM-DD` (UTC filter), newest first, max 500 |
| POST | /api/meals | Bearer | validated meal → 201 |
| DELETE | /api/meals/:id | Bearer | owner-only → 204 / 404 |
| POST | /api/meals/estimate | Bearer | OpenAI `{text}` → nutrition JSON (502 on AI failure) |
| GET/PUT | /api/goals | Bearer | `{dailyGoalKcal}` (500–20000) |

## Env (.env)
Required: PORT, MONGO_URI, JWT_SECRET, OPENAI_API_KEY.
Optional: NODE_ENV, JWT_EXPIRES_IN (7d), OPENAI_MODEL (gpt-4o-mini),
ESTIMATE_LIMIT (20), API_LIMIT (100), TRUST_PROXY (0/1), CORS_ORIGINS (comma list).

## Error shape
All errors: `{ "error": "message" }`. Stack traces only when NODE_ENV != production.
````

- [ ] **Step 4: Re-run suite as the task gate**

Run: `npm test`
Expected: PASS (docs-only change, but the suite must be green before committing).

- [ ] **Step 5: Commit**

```bash
git add README.md package.json
git commit -m "docs(api): endpoint table, env reference, npm test"
```

---

### Task 7: Frontend session layer — SecureStore, api client, AuthScreen, app gate

**Files:**
- Create: `src/lib/session.js`, `src/screens/AuthScreen.js`
- Rewrite: `lib/api.js`, `App.js`
- Modify: `package.json` (via `npx expo install expo-secure-store`)

**Interfaces:**
- Consumes: backend auth endpoints (Task 2); `tokens.js` (read-only); existing `SafeAreaProvider` wrapper in `App.js` — keep it (BottomNav uses `useSafeAreaInsets`).
- Produces for Tasks 8–10: `authFetch(path, {method, body})` attaching Bearer token, throwing `ApiError` with `.status` (`0` = unreachable); `setUnauthorizedHandler`; `bootstrap()/login()/signup()/logout()` from `src/lib/session.js`; `App` gate rendering `AuthScreen` when `user === null`.

- [ ] **Step 1: Install expo-secure-store**

Run (from `caly-ai-frontend/`): `npx expo install expo-secure-store`
Expected: added to `package.json` dependencies; no `expo-doctor` errors.

- [ ] **Step 2: Write the client + session code (no test harness exists on the RN side yet; verification is manual — Step 4)**

```js
// lib/api.js (rewrite entire file)
import * as SecureStore from 'expo-secure-store';

export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

const TOKEN_KEY = 'caly_token';
let tokenCache = null;
let unauthorizedHandler = null;

export function setUnauthorizedHandler(fn) {
  unauthorizedHandler = fn;
}

export async function getToken() {
  if (tokenCache !== null) return tokenCache;
  tokenCache = await SecureStore.getItemAsync(TOKEN_KEY);
  return tokenCache;
}

export async function setToken(token) {
  tokenCache = token;
  if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function authFetch(path, { method = 'GET', body } = {}) {
  const token = await getToken();
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    throw new ApiError('Cannot reach the server', 0);
  }
  if (res.status === 401 && token) {
    await setToken(null);
    if (unauthorizedHandler) unauthorizedHandler();
    throw new ApiError('Session expired', 401);
  }
  if (res.status === 204) return null;
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  if (!res.ok) {
    throw new ApiError((data && data.error) || `Request failed (${res.status})`, res.status);
  }
  return data;
}
```

Rules encoded above: network failure → `ApiError(status 0)`; server error body shape is always `{error}` so `e.message` is the server's message; 401 with a stored token → clear token + notify handler (only when a token existed, so a wrong-password login response never triggers it).

```js
// src/lib/session.js
import * as SecureStore from 'expo-secure-store';
import { authFetch, setToken, getToken } from '../../lib/api';

const EMAIL_KEY = 'caly_email';

async function setCachedEmail(email) {
  if (email) await SecureStore.setItemAsync(EMAIL_KEY, email);
  else await SecureStore.deleteItemAsync(EMAIL_KEY);
}

async function getCachedEmail() {
  return SecureStore.getItemAsync(EMAIL_KEY);
}

async function persistSession(data) {
  await setToken(data.token);
  await setCachedEmail(data.user.email);
  return data.user;
}

export async function login(email, password) {
  return persistSession(await authFetch('/api/auth/login', { method: 'POST', body: { email, password } }));
}

export async function signup(email, password) {
  return persistSession(await authFetch('/api/auth/signup', { method: 'POST', body: { email, password } }));
}

export async function logout() {
  await setToken(null);
  await setCachedEmail(null);
}

export async function bootstrap() {
  const token = await getToken();
  if (!token) return { user: null, offline: false };
  try {
    const me = await authFetch('/api/auth/me');
    return { user: me.user, offline: false };
  } catch (e) {
    if (e.status === 0 || e.status >= 500) {
      const email = await getCachedEmail();
      return { user: email ? { id: 'offline', email } : null, offline: true };
    }
    return { user: null, offline: false }; // 401: token already cleared by authFetch
  }
}
```

```js
// src/screens/AuthScreen.js
import { useState } from 'react';
import { ScrollView, TextInput, Text, View, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import PrimaryButton from '../components/ui/Button';
import { login, signup } from '../lib/session';
import { ApiError } from '../../lib/api';

export default function AuthScreen({ onSuccess }) {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const emailValid = /\S+@\S+\.\S+/.test(email.trim());
  const passwordValid = password.length >= 8;
  const canSubmit = emailValid && passwordValid && !loading;

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const user = mode === 'signin'
        ? await login(email.trim(), password)
        : await signup(email.trim(), password);
      onSuccess(user);
    } catch (e) {
      if (e instanceof ApiError && (e.status === 0 || e.status >= 500)) {
        setError('Cannot reach the server — tap below to try again.');
      } else if (e instanceof ApiError) {
        setError(e.message);
      } else {
        setError('Something went wrong — tap below to try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-cream">
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, justifyContent: 'center' }}>
        <Text className="text-3xl font-extrabold text-ink">Caly AI</Text>
        <Text className="text-muted mt-1 mb-8">Track calories, hit your goal</Text>

        <Text className="font-bold text-ink mb-2">Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          className="bg-white border border-[#F1E8E0] rounded-xl px-3 py-3 mb-3 text-ink"
        />
        <Text className="font-bold text-ink mb-2">Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="At least 8 characters"
          secureTextEntry
          autoComplete={mode === 'signin' ? 'password' : 'new-password'}
          className="bg-white border border-[#F1E8E0] rounded-xl px-3 py-3 mb-4 text-ink"
        />
        {password.length > 0 && !passwordValid && (
          <Text className="text-red-500 mb-3">Password must be at least 8 characters</Text>
        )}
        {error && <Text className="text-red-500 mb-3">{error}</Text>}

        <PrimaryButton title={loading ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'} disabled={!canSubmit} onPress={submit} />
        <Pressable onPress={() => { setMode(m => (m === 'signin' ? 'signup' : 'signin')); setError(null); }} className="mt-4 items-center">
          <Text className="text-primary font-semibold">
            {mode === 'signin' ? 'New here? Create an account' : 'Have an account? Sign in'}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
```

(The React Native import line in the snippet already includes `Pressable` for the mode-switch control.)

`App.js` — rewrite (keeps `SafeAreaProvider`, FAB, `BottomNav`, History tab, and `tokens.js` shadow styling exactly as they are now):

```js
import './global.css';
import { useState, useEffect } from 'react';
import { View, Pressable, ActivityIndicator, Text } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Plus } from 'lucide-react-native';
import DashboardScreen from './src/screens/DashboardScreen';
import LogFoodScreen from './src/screens/LogFoodScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import AuthScreen from './src/screens/AuthScreen';
import BottomNav from './src/components/ui/BottomNav';
import { mockMeals } from './src/lib/mockMeals';
import { bootstrap, logout } from './src/lib/session';
import { authFetch, setUnauthorizedHandler } from './lib/api';
const tokens = require('./src/theme/tokens.js');

export default function App() {
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState(null);
  const [offline, setOffline] = useState(false);
  const [tab, setTab] = useState('dashboard');
  const [meals, setMeals] = useState([]);
  const [goal, setGoal] = useState(2000);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setMeals([]);
    });
    let alive = true;
    bootstrap()
      .then(r => {
        if (!alive) return;
        setUser(r.user);
        if (r.offline) setOffline(true);
      })
      .finally(() => alive && setBooting(false));
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      try {
        const [m, g] = await Promise.all([authFetch('/api/meals'), authFetch('/api/goals')]);
        if (!alive) return;
        setMeals(m.meals);
        setGoal(g.dailyGoalKcal);
        setOffline(false);
      } catch (e) {
        if (!alive) return;
        if (e.status === 0 || e.status >= 500) {
          setMeals(mockMeals);
          setOffline(true);
        }
        // 401 handled by setUnauthorizedHandler
      }
    })();
    return () => { alive = false; };
  }, [user]);

  async function handleSave(meal) { /* Task 8 replaces this stub */ }

  function deleteMeal(id) { /* Task 8 replaces this stub */ }

  async function handleSaveGoal(value) { /* Task 10 replaces this stub */ }

  async function handleLogout() {
    await logout();
    setUser(null);
    setMeals([]);
    setOffline(false);
    setTab('dashboard');
  }

  if (booting) {
    return (
      <SafeAreaProvider>
        <View className="flex-1 bg-cream items-center justify-center">
          <ActivityIndicator size="large" color={tokens.colors.primary} />
          <Text className="text-muted mt-3">Loading…</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  if (!user) {
    return (
      <SafeAreaProvider>
        <AuthScreen onSuccess={u => { setUser(u); setOffline(false); }} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView edges={['top']} className="flex-1 bg-cream">
        <View className="flex-1">
          {tab === 'dashboard' && <DashboardScreen meals={meals} goal={goal} offline={offline} onAdd={() => setTab('log')} onDelete={deleteMeal} />}
          {tab === 'log' && <LogFoodScreen onSave={handleSave} />}
          {tab === 'history' && <HistoryScreen meals={meals} goal={goal} onAdd={() => setTab('log')} />}
          {tab === 'profile' && <ProfileScreen goal={goal} user={user} offline={offline} onSaveGoal={handleSaveGoal} onLogout={handleLogout} />}
          {tab !== 'log' && (
            <Pressable
              onPress={() => setTab('log')}
              accessibilityLabel="Log food"
              className="absolute right-5 bottom-6 w-14 h-14 rounded-full bg-primary items-center justify-center"
              style={{
                shadowColor: tokens.colors.primary,
                shadowOpacity: 0.4,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 6 },
                elevation: 8,
              }}
            >
              <Plus size={30} color="white" strokeWidth={2.5} />
            </Pressable>
          )}
        </View>
        <BottomNav active={tab} onChange={setTab} />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
```

The three stubs are intentional: Tasks 8 and 10 fill them in, so this task's app boots and gates correctly even before meals/goals wiring lands. `DashboardScreen` gets an `offline` prop now (used in Task 8); until then it simply ignores it.

- [ ] **Step 3: Syntax + bundle verification**

Run (from `caly-ai-frontend/`):
1. `npx expo-doctor` — Expected: passes (as before, 21/21).
2. `npx expo export --platform ios --output-dir "$env:TEMP\caly-export-check" --no-minify` — Expected: exits 0, bundle built (catches import/syntax errors in all new files).

- [ ] **Step 4: Manual gate (backend running from Task 6)**

1. `npm run dev` in `caly-ai-frontend/` (Expo Go on phone/emulator, same network as backend with `EXPO_PUBLIC_API_URL` set — if not yet set, the default `http://localhost:5000` works only on iOS simulator).
2. Fresh install of the app → AuthScreen appears (not the dashboard).
3. Create account with a new email → lands on dashboard (empty state, goal 2000).
4. Kill the backend, reload the app → previously stored session restores (offline path, no crash); meals fall back to mock.
5. Fresh reinstall (or clear app storage) → AuthScreen returns (no cached session).

Caveat for this gate: the Profile tab's Save/Logout buttons only become safe to press after Task 10 (its props land there) — skip profile interactions until then; logout/restore is re-verified in the Task 10 gate.

- [ ] **Step 5: Commit**

```bash
git add lib/api.js src/lib/session.js src/screens/AuthScreen.js App.js package.json package-lock.json
git commit -m "feat(auth): SecureStore session, authFetch client, login/signup gate"
```

---

### Task 8: Meals wiring — save/delete against API with offline fallback

**Files:**
- Modify: `App.js` (`handleSave`, `deleteMeal` stubs), `src/screens/LogFoodScreen.js` (async save contract), `src/screens/DashboardScreen.js` (offline banner)

**Interfaces:**
- Consumes: `authFetch` + `ApiError` (Task 7), backend meals routes (Task 3).
- Produces for Tasks 9–10: `onSave(meal)` now returns a Promise resolving to `{ok: true}` or `{ok: false, error}` (never throws) — LogFoodScreen shows `error` inline; `offline` prop on DashboardScreen.

- [ ] **Step 1: Replace `handleSave` and `deleteMeal` in `App.js`**

```js
  async function handleSave(meal) {
    const tempId = `local-${Date.now()}`;
    const loggedAt = meal.loggedAt || new Date().toISOString();
    const localEntry = { id: tempId, loggedAt, ...meal };
    setMeals(prev => [localEntry, ...prev]);
    try {
      const created = await authFetch('/api/meals', { method: 'POST', body: { ...meal, loggedAt } });
      setMeals(prev => prev.map(m => (m.id === tempId ? created : m)));
      setTab('dashboard');
      return { ok: true };
    } catch (e) {
      if (e.status >= 400 && e.status < 500) {
        setMeals(prev => prev.filter(m => m.id !== tempId));
        return { ok: false, error: e.message };
      }
      setOffline(true);
      setTab('dashboard');
      return { ok: true, offline: true };
    }
  }

  function deleteMeal(id) {
    setMeals(prev => prev.filter(m => m.id !== id));
    if (!String(id).startsWith('local-')) {
      authFetch(`/api/meals/${id}`, { method: 'DELETE' }).catch(e => {
        if (e.status === 0 || e.status >= 500) setOffline(true);
      });
    }
  }
```

Behavior encoded: optimistic local add first (works offline), swap temp id for the server id when the POST lands; `4xx` rolls back and surfaces the message; unreachable/`5xx` keeps the local entry and flags offline; delete is fire-and-forget (404 = already gone, keep removed).

- [ ] **Step 2: Async save contract in `LogFoodScreen.js`**

Add state next to the existing `useState`s:

```js
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
```

Add the handler:

```js
  async function saveMeal() {
    setSaving(true);
    setSaveError(null);
    const r = await onSave({ name: name.trim(), kcal: Number(kcal), protein: 0, carbs: 0, fat: 0, mealType: type });
    setSaving(false);
    if (!r || !r.ok) setSaveError((r && r.error) || 'Could not save the meal');
  }
```

Replace the save button block (keep everything else untouched; Task 9 rewrites the estimate card):

```jsx
          {!canSave && !saving && <Text className="text-red-500 mb-2">Enter a name and kcal &gt; 0</Text>}
          {saveError && <Text className="text-red-500 mb-2">{saveError}</Text>}
          <PrimaryButton title={saving ? 'Saving…' : 'Save meal'} disabled={!canSave || saving} onPress={saveMeal} />
```

- [ ] **Step 3: Offline banner in `DashboardScreen.js`**

Change the props line to:

```js
export default function DashboardScreen({ meals = [], goal = 2000, offline = false, onAdd, onDelete }) {
```

Insert immediately after the `DaySelector` block:

```jsx
        {offline && (
          <View className="mt-3 bg-white border border-[#F1E8E0] rounded-xl px-3 py-2">
            <Text className="text-xs text-muted">Offline — showing local data; changes sync when you reconnect</Text>
          </View>
        )}
```

- [ ] **Step 4: Manual verification (backend running)**

1. Backend ON: log a meal → it appears on today's dashboard, tap delete → gone. Reload the app → list matches the server (persisted in Mongo).
2. Backend ON: enter `99999` as kcal → Save shows the server's `400` message, no phantom entry appears.
3. Backend OFF (restart with server killed): reload app → offline banner shows; log a meal → it stays locally; estimate card untouched (Task 9).
4. Cross-check with DB: `mongosh`/Atlas → `db.meals.find()` shows the created docs with the right `userId`.

- [ ] **Step 5: Commit**

```bash
git add App.js src/screens/LogFoodScreen.js src/screens/DashboardScreen.js
git commit -m "feat(meals): API-backed save/delete with optimistic local fallback"
```

---

### Task 9: AI estimate wiring — estimate card + Apply

**Files:**
- Modify: `src/screens/LogFoodScreen.js` (estimate card), `src/lib/mockMeals.js` (`estimateMock` shape)

**Interfaces:**
- Consumes: `POST /api/meals/estimate` (Task 4), `authFetch` (Task 7), save contract from Task 8.
- Produces: filled manual-entry form via "Apply estimate"; `estimateMock` now returns `{name, kcal, protein, carbs, fat, mealType}` so the offline fallback applies cleanly.

- [ ] **Step 1: Extend `estimateMock` in `src/lib/mockMeals.js`**

```js
export function estimateMock(text) {
  if (!text || !text.trim()) return { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  return { name: 'Estimated meal', kcal: 320, protein: 20, carbs: 25, fat: 12, mealType: 'Snack' };
}
```

- [ ] **Step 2: Rewrite the estimate half of `LogFoodScreen.js`**

Replace imports (`ApiError`/`authFetch` join), state, and the estimate card. Full final file:

```jsx
import { useState } from 'react';
import { ScrollView, TextInput, Text, View } from 'react-native';
import Card from '../components/ui/Card';
import Chip from '../components/ui/Chip';
import PrimaryButton from '../components/ui/Button';
import { estimateMock } from '../lib/mockMeals';
import { authFetch, ApiError } from '../../lib/api';

const TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

export default function LogFoodScreen({ onSave }) {
  const [aiText, setAiText] = useState('');
  const [est, setEst] = useState(null);
  const [estimating, setEstimating] = useState(false);
  const [estError, setEstError] = useState(null);
  const [name, setName] = useState('');
  const [kcal, setKcal] = useState('');
  const [macros, setMacros] = useState({ protein: 0, carbs: 0, fat: 0 });
  const [type, setType] = useState('Snack');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const canEstimate = aiText.trim().length >= 3 && !estimating;
  const canSave = name.trim().length > 0 && Number(kcal) > 0 && !saving;

  async function runEstimate() {
    setEstimating(true);
    setEstError(null);
    try {
      const r = await authFetch('/api/meals/estimate', { method: 'POST', body: { text: aiText.trim() } });
      setEst(r);
    } catch (e) {
      if (e instanceof ApiError && (e.status === 0 || e.status >= 500)) {
        setEst(estimateMock(aiText));
        setEstError(e.status === 0
          ? 'Offline — using an approximate estimate'
          : 'AI unavailable — using an approximate estimate');
      } else {
        setEst(null);
        setEstError(e instanceof ApiError ? e.message : 'Estimate failed');
      }
    } finally {
      setEstimating(false);
    }
  }

  function applyEstimate() {
    setName(est.name);
    setKcal(String(est.kcal));
    setMacros({ protein: est.protein, carbs: est.carbs, fat: est.fat });
    setType(est.mealType);
  }

  async function saveMeal() {
    setSaving(true);
    setSaveError(null);
    const r = await onSave({
      name: name.trim(),
      kcal: Number(kcal),
      protein: macros.protein,
      carbs: macros.carbs,
      fat: macros.fat,
      mealType: type,
    });
    setSaving(false);
    if (!r || !r.ok) setSaveError((r && r.error) || 'Could not save the meal');
  }

  return (
    <ScrollView className="flex-1 bg-cream px-4 pt-12">
      <Text className="text-2xl font-bold text-ink mb-4">Log food</Text>
      <Card>
        <Text className="font-bold text-ink mb-2">AI estimate</Text>
        <TextInput
          value={aiText}
          onChangeText={setAiText}
          placeholder="e.g. 2 eggs + toast"
          className="bg-cream rounded-xl px-3 py-2 mb-2"
        />
        <PrimaryButton title={estimating ? 'Estimating…' : 'Estimate'} disabled={!canEstimate} onPress={runEstimate} />
        {aiText.trim().length < 3 && <Text className="text-muted mt-2">Type at least 3 characters to estimate</Text>}
        {estError && <Text className="text-muted mt-2">{estError}</Text>}
        {est && est.kcal > 0 && (
          <View className="mt-2">
            <Text className="text-muted">~{est.kcal} kcal • P{est.protein} C{est.carbs} F{est.fat}</Text>
            <View className="mt-2">
              <PrimaryButton title="Apply estimate" onPress={applyEstimate} />
            </View>
          </View>
        )}
      </Card>
      <View className="mt-4 mb-24">
        <Card>
          <Text className="font-bold text-ink mb-2">Manual entry</Text>
          <TextInput value={name} onChangeText={setName} placeholder="Food name" className="bg-cream rounded-xl px-3 py-2 mb-2" />
          <TextInput value={kcal} onChangeText={setKcal} placeholder="kcal" keyboardType="numeric" className="bg-cream rounded-xl px-3 py-2 mb-2" />
          <View className="flex-row mb-4">
            {TYPES.map(t => <Chip key={t} label={t} active={type === t} onPress={() => setType(t)} />)}
          </View>
          {!canSave && !saving && <Text className="text-red-500 mb-2">Enter a name and kcal &gt; 0</Text>}
          {saveError && <Text className="text-red-500 mb-2">{saveError}</Text>}
          <PrimaryButton title={saving ? 'Saving…' : 'Save meal'} disabled={!canSave || saving} onPress={saveMeal} />
        </Card>
      </View>
    </ScrollView>
  );
}
```

- [ ] **Step 3: Manual verification**

1. Backend ON + valid `OPENAI_API_KEY`: type `grilled chicken with rice` → real estimate appears → Apply fills name/kcal/macros/type → Save → dashboard shows it with macros.
2. Backend OFF: Estimate → falls back to mock numbers with the offline notice → Apply still works → Save stores locally.
3. Rate-limit sanity: 4 rapid estimates on a low `ESTIMATE_LIMIT` dev value → the 429 message renders inline (form stays intact).

- [ ] **Step 4: Commit**

```bash
git add src/screens/LogFoodScreen.js src/lib/mockMeals.js
git commit -m "feat(meals): AI estimate with apply and graceful fallback"
```

---

### Task 10: Profile — goal sync, email display, logout

**Files:**
- Modify: `App.js` (`handleSaveGoal` stub), `src/screens/ProfileScreen.js` (rewrite)

**Interfaces:**
- Consumes: `PUT/GET /api/goals` (Task 5), `logout()` from session (Task 7).
- Produces: `onSaveGoal(value)` returning `{ok}` / `{ok, offline}` / `{ok: false, error}`; Profile renders `user`, `offline` props.

- [ ] **Step 1: Replace `handleSaveGoal` in `App.js`**

```js
  async function handleSaveGoal(value) {
    const prev = goal;
    setGoal(value);
    try {
      await authFetch('/api/goals', { method: 'PUT', body: { dailyGoalKcal: value } });
      return { ok: true };
    } catch (e) {
      if (e.status >= 400 && e.status < 500) {
        setGoal(prev);
        return { ok: false, error: e.message };
      }
      setOffline(true);
      return { ok: true, offline: true };
    }
  }
```

- [ ] **Step 2: Rewrite `src/screens/ProfileScreen.js`**

```jsx
import { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import Card from '../components/ui/Card';
import PrimaryButton from '../components/ui/Button';
import { API_URL } from '../../lib/api';

export default function ProfileScreen({ goal, user, offline, onSaveGoal, onLogout }) {
  const [draft, setDraft] = useState(String(goal));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [savedOffline, setSavedOffline] = useState(false);
  const parsed = Number(draft);
  const valid = draft.trim().length > 0 && Number.isFinite(parsed) && parsed >= 500 && parsed <= 20000;

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    const r = await onSaveGoal(parsed);
    setSaving(false);
    if (r && r.ok) {
      setSaved(true);
      setSavedOffline(!!r.offline);
    } else {
      setError((r && r.error) || 'Could not save goal');
    }
  }

  return (
    <ScrollView className="flex-1 bg-cream px-4 pt-12">
      <Text className="text-2xl font-bold text-ink mb-4">Profile</Text>
      <Card>
        <Text className="font-bold mb-2">Daily goal (kcal)</Text>
        <TextInput value={draft} onChangeText={setDraft} keyboardType="numeric" className="bg-cream rounded-xl px-3 py-2 mb-2" />
        {!valid && <Text className="text-red-500 mb-2">Enter a goal between 500 and 20000</Text>}
        {error && <Text className="text-red-500 mb-2">{error}</Text>}
        {saved && (
          <Text className="text-muted mb-2">
            {savedOffline ? 'Saved locally — syncs when you reconnect' : 'Goal saved'}
          </Text>
        )}
        <Text className="text-muted text-sm mb-2">{user ? user.email : 'Not signed in'} • API: {API_URL}</Text>
        {offline && <Text className="text-muted text-sm mb-2">Offline — server unreachable</Text>}
        <PrimaryButton title={saving ? 'Saving…' : 'Save goal'} disabled={!valid || saving} onPress={save} />
      </Card>
      <View className="mt-4 mb-24">
        <Card>
          <Text className="text-muted mb-3">Units: metric (v1) • Notifications: off (v1)</Text>
          <PrimaryButton title="Log out" onPress={onLogout} />
        </Card>
      </View>
    </ScrollView>
  );
}
```

Client validation mirrors the server range (500–20000) so a `400` here is unexpected; when one still happens it renders via `error`.

- [ ] **Step 3: Manual verification**

1. Backend ON: set goal to `1500`, Save → dashboard hero shows `/1500`; kill + restart app → still `1500` (came from `GET /api/goals`).
2. Invalid values `100` / `99999` → client-side message, no request.
3. Backend OFF: Save goal → `Saved locally — syncs when you reconnect`; restart app offline → dashboard goal shows the local value (bootstrap kept session, data load fell back).
4. Log out → AuthScreen with empty fields; log back in → goal + meals restored.

- [ ] **Step 4: Commit**

```bash
git add App.js src/screens/ProfileScreen.js
git commit -m "feat(profile): goal sync, account display, logout"
```

---

### Task 11: Frontend env, gitignore, full verification

**Files:**
- Create: `.env`
- Modify: `.env.example`, `.gitignore`

**Interfaces:**
- Consumes: everything from Tasks 1–10.
- Produces: a run configuration where a physical phone on the same Wi‑Fi reaches the backend; repo hygiene; the final verification gate.

- [ ] **Step 1: Configure `EXPO_PUBLIC_API_URL` for LAN**

Detect the machine's LAN IPv4 (Wi‑Fi network the phone is also on):

```powershell
Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } | Select-Object IPAddress, InterfaceAlias
```

Create `.env` (replace the IP with the Wi‑Fi one from the output):

```
EXPO_PUBLIC_API_URL=http://192.168.1.10:5000
```

Notes: iOS simulator can use `http://localhost:5000`; Android emulator needs `http://10.0.2.2:5000`; a physical device needs the LAN IP + backend already listening (Express default binds all interfaces — no change needed). Restart `npx expo start -c` after any `.env` change (env is baked at bundle time).

Ensure `.env.example` content:

```
# Backend base URL. Physical device: http://<your-LAN-IP>:5000 (same Wi-Fi).
# iOS simulator: http://localhost:5000 — Android emulator: http://10.0.2.2:5000
EXPO_PUBLIC_API_URL=http://localhost:5000
```

- [ ] **Step 2: Gitignore `.env`**

In `.gitignore`, replace the `local env files` block with:

```
# local env files
.env
.env*.local
```

Verify: `git status --porcelain` must NOT list `.env` (it currently would).

- [ ] **Step 3: Full verification gate**

From `caly-ai-frontend/`:
1. `npx expo-doctor` — Expected: all checks pass.
2. `npx expo export --platform ios --output-dir "$env:TEMP\caly-export-check" --no-minify` — Expected: exit 0.
3. `npx expo lint` — Expected: if it reports no lint config, do NOT scaffold one (repo has none by design); note it and move on. Same for `npx tsc --noEmit` (no tsconfig).
4. Sanity grep: `rg "@expo/vector-icons"` — Expected: zero matches outside `docs/`.

From `caly-ai-backend/`:
5. `npm test` — Expected: five suites, `0 failed`, exit 0.

- [ ] **Step 4: End-to-end manual click-through (phone/emulator + backend running)**

- [ ] M1 — Backend stopped, fresh app start: AuthScreen appears; submitting shows "Cannot reach the server" (retry by tapping again); no crash.
- [ ] M2 — Backend started: create account → dashboard empty state, goal `2000`.
- [ ] M3 — Log a real meal (estimate + Apply + Save) → appears under today; full app restart → still there (server persisted, session restored silently).
- [ ] M4 — Delete the meal → gone; restart → still gone.
- [ ] M5 — Backend stopped, restart app: offline banner on dashboard + mock/local meals; log a meal → kept locally; Estimate → approximate fallback notice; goal save → "Saved locally"; nothing crashes.
- [ ] M6 — Backend restarted, app restarted: real data loads again (note: locally-only meals from M5 stay local until re-logged — expected, no write queue by design).
- [ ] M7 — Log out → AuthScreen; log back in → account data restored; token lives only in SecureStore (not AsyncStorage, never logged).

- [ ] **Step 5: Commit**

```bash
git add .env.example .gitignore
git commit -m "chore(env): LAN API URL config and ignore .env"
```

(`.env` itself stays untracked.)

---

## Execution notes

- Run each task's commands, files, and commits from that task's repo root: Tasks 1–6 from `caly-ai-backend/`, Tasks 7–11 from `caly-ai-frontend/`.
- Order is strict: backend Tasks 1→6 first (each task's tests depend on earlier routes/middleware), then frontend Tasks 7→11 (each builds on the previous contract).
- Backend tasks are TDD: failing test → minimal implementation → passing test → commit. Frontend tasks have no test harness (RN, no jest in repo — do not add one); each ends with bundle verification + manual gate → commit.
- Every backend test script must pass `NODE_ENV=production` before requiring `src/app.js` (exercises the no-stack error path) and run against a database you can wipe — they create and delete their own users/meals/goals.
- If `npm test` fails anywhere: fix within that task, re-run only that script first (`node scripts/test-<name>.js`), then the full chain.
- Do not commit until the task's verification step passes. Do not push.





