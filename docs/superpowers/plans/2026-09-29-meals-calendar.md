# Meals Backend + Calendar Rings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace mock meals with a real MongoDB-backed meals API and show a per-day progress ring in the week strip, and remove the header logo.

**Architecture:** Backend gains a `Meal` Mongoose model plus a `/api/meals` router (range GET, validated POST, DELETE) mounted in the existing Express app. Frontend gains a `mealsApi` client, week-load with loading/error states in `App.js`, per-day totals passed to `DaySelector` which renders a mini `ProgressRing` per day. No auth, single user.

**Tech Stack:** Express 5, Mongoose 9, zod 4, Node built-in `node:test`; Expo SDK 57, React Native, NativeWind 4, react-native-svg (already installed).

**Spec:** `E:\Caly Ai\caly-ai-frontend\docs\superpowers\specs\2026-09-29-meals-backend-calendar-design.md`

## Global Constraints

- Backend is CommonJS (`require`/`module.exports`); frontend is ESM (`import`/`export`).
- No auth of any kind; single-user data.
- Goal value stays client-side (`App.js` state); never sent to or read from the backend.
- Meal JSON over the wire uses `id` (string), never `_id`/`__v`.
- Day boundaries are server-local timezone (documented limitation, not a bug to fix here).
- No new native dependencies; no new npm packages except none (all needed deps exist).
- Backend must still boot with no `MONGO_URI` (existing behavior); meals endpoints answer `503` then.

## Review Focus

- `kcal` sent as a string (`"320"`) is rejected with `400` — the client must always send a number (`Number(kcal)` as `LogFoodScreen` already does).
- `GET` with malformed dates (`?from=tomorrow`, `?from=2026-13-40`) returns `400`, never a 500 or an unbounded full-collection dump.
- Deleting an already-deleted id returns `404`, not success.
- A meal POSTed without `emoji`/`macros`/`mealType` still renders in `MealRow` (defaults fill every field the UI reads).
- Backend down on app launch shows the retry UI, not a hang or a crash.

## File Structure

Create:
- `E:\Caly Ai\caly-ai-backend\src\models\Meal.js` — Mongoose schema + `id` JSON mapping.
- `E:\Caly Ai\caly-ai-backend\src\routes\meals.routes.js` — zod schema (exported), GET/POST/DELETE handlers.
- `E:\Caly Ai\caly-ai-backend\src\routes\meals.validation.test.js` — `node:test` tests for schema + model.
- `E:\Caly Ai\caly-ai-frontend\src\lib\mealsApi.js` — `weekRange`, `fetchWeek`, `createMeal`, `deleteMealById`.

Modify:
- `E:\Caly Ai\caly-ai-backend\src\index.js` — mount `/api/meals` (replaces TODO comments).
- `E:\Caly Ai\caly-ai-frontend\lib\api.js` — add `apiDelete`.
- `E:\Caly Ai\caly-ai-frontend\App.js` — real data flow (load/error/retry/optimistic save/delete).
- `E:\Caly Ai\caly-ai-frontend\src\screens\DashboardScreen.js` — remove logo + streak, loading/error states, `totalsByDate`.
- `E:\Caly Ai\caly-ai-frontend\src\components\dashboard\DaySelector.js` — mini ring per day.
- `E:\Caly Ai\caly-ai-frontend\src\screens\LogFoodScreen.js` — disable mock AI estimate.

Delete:
- `E:\Caly Ai\caly-ai-frontend\src\lib\mockMeals.js` (after API path works).

---

### Task 1: Backend Meal model + validation tests

**Files:**
- Create: `E:\Caly Ai\caly-ai-backend\src\models\Meal.js`
- Create: `E:\Caly Ai\caly-ai-backend\src\routes\meals.routes.js` (zod schema + stub handlers returning 501; real handlers in Task 2)
- Create: `E:\Caly Ai\caly-ai-backend\src\routes\meals.validation.test.js`
- Test: run `node --test src/routes/meals.validation.test.js` from `E:\Caly Ai\caly-ai-backend`

**Interfaces:**
- Consumes: `mongoose`, `zod` (both already in `package.json`).
- Produces: `Meal` model (`require('../models/Meal')`); `mealBodySchema` (`require('./meals.routes').mealBodySchema`); router with 501 stubs (Task 2 replaces stubs).

- [ ] **Step 1: Write the model file**

```js
const mongoose = require('mongoose');

const mealSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'name is required'], trim: true, maxlength: 120 },
    kcal: { type: Number, required: [true, 'kcal is required'], min: 0, max: 10000 },
    protein: { type: Number, default: 0, min: 0 },
    carbs: { type: Number, default: 0, min: 0 },
    fat: { type: Number, default: 0, min: 0 },
    mealType: { type: String, enum: ['Breakfast', 'Lunch', 'Dinner', 'Snack'], default: 'Snack' },
    emoji: { type: String, default: '🍽️' },
    loggedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

mealSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Meal', mealSchema);
```

- [ ] **Step 2: Write the routes file with zod schema + 501 stubs**

```js
const express = require('express');
const { z } = require('zod');

const mealBodySchema = z.object({
  name: z.string().trim().min(1, 'name is required').max(120),
  kcal: z.number().gt(0).lte(10000),
  protein: z.number().min(0).default(0),
  carbs: z.number().min(0).default(0),
  fat: z.number().min(0).default(0),
  mealType: z.enum(['Breakfast', 'Lunch', 'Dinner', 'Snack']).default('Snack'),
  emoji: z.string().default('🍽️'),
  loggedAt: z.string().datetime({ offset: true }).optional(),
});

const router = express.Router();
router.get('/', (_req, res) => res.status(501).json({ error: 'not implemented' }));
router.post('/', (_req, res) => res.status(501).json({ error: 'not implemented' }));
router.delete('/:id', (_req, res) => res.status(501).json({ error: 'not implemented' }));

module.exports = router;
module.exports.mealBodySchema = mealBodySchema;
```

- [ ] **Step 3: Write the failing test file**

```js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { mealBodySchema } = require('./meals.routes');
const Meal = require('../models/Meal');

describe('mealBodySchema', () => {
  it('accepts a valid manual entry and fills defaults', () => {
    const r = mealBodySchema.safeParse({ name: 'Oatmeal', kcal: 320, mealType: 'Breakfast' });
    assert.equal(r.success, true);
    assert.equal(r.data.protein, 0);
    assert.equal(r.data.emoji, '🍽️');
  });
  it('rejects empty name, non-positive kcal, bad mealType', () => {
    assert.equal(mealBodySchema.safeParse({ name: '  ', kcal: 100 }).success, false);
    assert.equal(mealBodySchema.safeParse({ name: 'X', kcal: 0 }).success, false);
    assert.equal(mealBodySchema.safeParse({ name: 'X', kcal: 100, mealType: 'Brunch' }).success, false);
  });
  it('rejects string kcal', () => {
    assert.equal(mealBodySchema.safeParse({ name: 'X', kcal: '320' }).success, false);
  });
});

describe('Meal model', () => {
  it('requires name and kcal', () => {
    const err = new Meal({}).validateSync();
    assert.ok(err.errors.name);
    assert.ok(err.errors.kcal);
  });
  it('maps _id to id and strips __v in JSON', () => {
    const json = new Meal({ name: 'X', kcal: 10 }).toJSON();
    assert.equal(typeof json.id, 'string');
    assert.equal(json._id, undefined);
    assert.equal(json.__v, undefined);
  });
});
```

- [ ] **Step 4: Run test, expect failures (files just created — run proves harness works; if model/schema wrong, tests fail here)**

Run: `node --test src/routes/meals.validation.test.js` (workdir `E:\Caly Ai\caly-ai-backend`)
Expected: 5 PASS. If any FAIL, fix the model/schema, not the test.

- [ ] **Step 5: Commit**

```bash
git add src/models/Meal.js src/routes/meals.routes.js src/routes/meals.validation.test.js
git commit -m "feat(backend): Meal model, validation schema and tests"
```

---

### Task 2: Backend meals endpoints + wiring

**Files:**
- Modify: `E:\Caly Ai\caly-ai-backend\src\routes\meals.routes.js` (replace 501 stubs)
- Modify: `E:\Caly Ai\caly-ai-backend\src\index.js` (mount router)
- Test: live endpoint checks below against `npm run dev` (needs real `MONGO_URI`)

**Interfaces:**
- Consumes: `Meal` model, `mealBodySchema` from Task 1.
- Produces: `GET /api/meals?from=&to=` → `{ meals }`; `POST /api/meals` → `201 { meal }`; `DELETE /api/meals/:id` → `{ deleted: true }`.

- [ ] **Step 1: Replace stubs with real handlers** (full file — replaces the Task 1 stub version, keeps the schema block identical)

```js
const express = require('express');
const mongoose = require('mongoose');
const { z } = require('zod');
const Meal = require('../models/Meal');

const mealBodySchema = z.object({
  name: z.string().trim().min(1, 'name is required').max(120),
  kcal: z.number().gt(0).lte(10000),
  protein: z.number().min(0).default(0),
  carbs: z.number().min(0).default(0),
  fat: z.number().min(0).default(0),
  mealType: z.enum(['Breakfast', 'Lunch', 'Dinner', 'Snack']).default('Snack'),
  emoji: z.string().default('🍽️'),
  loggedAt: z.string().datetime({ offset: true }).optional(),
});

function dayBound(s, endOfDay) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3], endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
  if (d.getFullYear() !== +m[1] || d.getMonth() !== +m[2] - 1 || d.getDate() !== +m[3]) return null;
  return d;
}

function dbDown(res) {
  if (mongoose.connection.readyState !== 1) {
    res.status(503).json({ error: 'database unavailable' });
    return true;
  }
  return false;
}

const router = express.Router();

router.get('/', async (req, res) => {
  if (dbDown(res)) return;
  const from = dayBound(req.query.from, false);
  const to = dayBound(req.query.to, true);
  if (!from || !to || from > to) {
    return res.status(400).json({ error: 'from and to query params required as YYYY-MM-DD' });
  }
  const meals = await Meal.find({ loggedAt: { $gte: from, $lte: to } }).sort({ loggedAt: 1 });
  res.json({ meals });
});

router.post('/', async (req, res) => {
  if (dbDown(res)) return;
  const parsed = mealBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid meal', details: parsed.error.issues });
  }
  const meal = await Meal.create(parsed.data);
  res.status(201).json({ meal });
});

router.delete('/:id', async (req, res) => {
  if (dbDown(res)) return;
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: 'invalid id' });
  }
  const deleted = await Meal.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'meal not found' });
  res.json({ deleted: true });
});

module.exports = router;
module.exports.mealBodySchema = mealBodySchema;
```

- [ ] **Step 2: Mount the router in `src/index.js`** — replace the block

```js
// TODO: routes
// app.use('/api/auth', require('./routes/auth.routes'));
// app.use('/api/meals', require('./routes/meals.routes'));
// app.use('/api/scan', require('./routes/scan.routes'));
// app.use('/api/goals', require('./routes/goals.routes'));
```

with

```js
app.use('/api/meals', require('./routes/meals.routes'));
// TODO: app.use('/api/auth', require('./routes/auth.routes'));
// TODO: app.use('/api/scan', require('./routes/scan.routes'));
// TODO: app.use('/api/goals', require('./routes/goals.routes'));
```

- [ ] **Step 3: Re-run unit tests (schema export must survive the rewrite)**

Run: `node --test src/routes/meals.validation.test.js` (workdir `E:\Caly Ai\caly-ai-backend`)
Expected: 5 PASS.

- [ ] **Step 4: Live endpoint check** (start `npm run dev` in another shell first; use today's real date)

```powershell
$b = Invoke-RestMethod -Method Post -Uri 'http://localhost:5000/api/meals' -ContentType 'application/json' -Body '{"name":"Verify oats","kcal":320,"mealType":"Breakfast"}'
# Expected: 201, $b.meal.id is a non-empty string, $b.meal.emoji -eq '🍽️'
$b.meal.id; $b.meal.emoji
$r = Invoke-RestMethod -Uri 'http://localhost:5000/api/meals?from=2026-09-28&to=2026-09-29'
# Expected: $r.meals contains the verify meal
($r.meals | Where-Object { $_.id -eq $b.meal.id }).name
try { Invoke-WebRequest -Method Post -Uri 'http://localhost:5000/api/meals' -ContentType 'application/json' -Body '{"name":"","kcal":0}' -UseBasicParsing } catch { $_.Exception.Response.StatusCode.value__ }
# Expected: 400
try { Invoke-WebRequest -Uri 'http://localhost:5000/api/meals?from=tomorrow' -UseBasicParsing } catch { $_.Exception.Response.StatusCode.value__ }
# Expected: 400
$d = Invoke-RestMethod -Method Delete -Uri "http://localhost:5000/api/meals/$($b.meal.id)"
# Expected: $d.deleted -eq $true
$d.deleted
try { Invoke-WebRequest -Method Delete -Uri "http://localhost:5000/api/meals/$($b.meal.id)" -UseBasicParsing } catch { $_.Exception.Response.StatusCode.value__ }
# Expected: 404 (already deleted)
```

Delete the verify meal if still present, then:

- [ ] **Step 5: Commit**

```bash
git add src/routes/meals.routes.js src/index.js
git commit -m "feat(backend): meals CRUD endpoints and router wiring"
```

---

### Task 3: Frontend API client (`apiDelete` + `mealsApi`)

**Files:**
- Modify: `E:\Caly Ai\caly-ai-frontend\lib\api.js` (append `apiDelete`)
- Create: `E:\Caly Ai\caly-ai-frontend\src\lib\mealsApi.js`
- Test: `npx expo-doctor` passes; Metro bundles (checked in Task 6 export)

**Interfaces:**
- Consumes: `apiGet`/`apiPost` (existing), new `apiDelete`; `dateKey` from `src/utils/format.js`.
- Produces: `weekRange(ref)` → `{ from, to }` dateKey strings; `fetchWeek(ref?)` → meals array; `createMeal(meal)` → saved meal; `deleteMealById(id)` → `true`.

- [ ] **Step 1: Append `apiDelete` to `lib/api.js`**

```js
export async function apiDelete(path) {
  const res = await fetch(`${API_URL}${path}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`DELETE ${path} failed: ${res.status}`);
  return res.json();
}
```

- [ ] **Step 2: Create `src/lib/mealsApi.js`**

```js
import { apiGet, apiPost, apiDelete } from '../../lib/api';
import { dateKey } from '../utils/format';

export function weekRange(reference) {
  const ref = reference instanceof Date ? reference : new Date(reference);
  const start = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() - ref.getDay());
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
  return { from: dateKey(start), to: dateKey(end) };
}

export async function fetchWeek(reference = new Date()) {
  const { from, to } = weekRange(reference);
  const data = await apiGet(`/api/meals?from=${from}&to=${to}`);
  return data.meals;
}

export async function createMeal(meal) {
  const data = await apiPost('/api/meals', meal);
  return data.meal;
}

export async function deleteMealById(id) {
  const data = await apiDelete(`/api/meals/${id}`);
  return data.deleted;
}
```

- [ ] **Step 3: Sanity-check the week math in plain node** (no test runner in this repo; exact command + expected output)

Run: `node -e "const d=new Date(2026,8,29);const s=new Date(d.getFullYear(),d.getMonth(),d.getDate()-d.getDay());console.log(s.toDateString())"` (any workdir)
Expected: `Sun Sep 27 2026` (2026-09-29 is a Tuesday; week starts Sunday 27th).

- [ ] **Step 4: Commit**

```bash
git add lib/api.js src/lib/mealsApi.js
git commit -m "feat(frontend): meals API client with week-range fetch"
```

---

### Task 4: `App.js` real-data flow

**Files:**
- Modify: `E:\Caly Ai\caly-ai-frontend\App.js`
- Test: device check in Task 6 (loading → data; backend down → retry)

**Interfaces:**
- Consumes: `fetchWeek`, `createMeal`, `deleteMealById` from Task 3.
- Produces: `meals` state always shaped like server meals (`{ id, loggedAt, name, kcal, protein, carbs, fat, mealType, emoji }`); passes `loading`, `error`, `onRetry` to `DashboardScreen`.

- [ ] **Step 1: Replace the mock-data flow** — full new file content (replaces current `App.js`):

```js
import './global.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Pressable } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Plus } from 'lucide-react-native';
import DashboardScreen from './src/screens/DashboardScreen';
import LogFoodScreen from './src/screens/LogFoodScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import BottomNav from './src/components/ui/BottomNav';
import { fetchWeek, createMeal, deleteMealById } from './src/lib/mealsApi';
const tokens = require('./src/theme/tokens.js');

export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [goal, setGoal] = useState(2000);
  const snapshotRef = useRef([]);

  const loadWeek = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setMeals(await fetchWeek(new Date()));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadWeek(); }, [loadWeek]);

  async function handleSave(meal) {
    const tempId = `temp-${Date.now()}`;
    const optimistic = { id: tempId, loggedAt: new Date().toISOString(), emoji: '🍽️', ...meal };
    setMeals(prev => [optimistic, ...prev]);
    setTab('dashboard');
    try {
      const saved = await createMeal({ ...meal, loggedAt: optimistic.loggedAt });
      setMeals(prev => prev.map(m => (m.id === tempId ? saved : m)));
    } catch (e) {
      setMeals(prev => prev.filter(m => m.id !== tempId));
      setError(e.message);
    }
  }

  function deleteMeal(id) {
    setMeals(prev => {
      snapshotRef.current = prev;
      return prev.filter(m => m.id !== id);
    });
    deleteMealById(id).catch(e => {
      setMeals(snapshotRef.current);
      setError(e.message);
    });
  }

  return (
    <SafeAreaProvider>
    <SafeAreaView edges={['top']} className="flex-1 bg-cream">
      <View className="flex-1">
        {tab === 'dashboard' && (
          <DashboardScreen meals={meals} goal={goal} loading={loading} error={error} onRetry={loadWeek} onAdd={() => setTab('log')} onDelete={deleteMeal} />
        )}
        {tab === 'log' && <LogFoodScreen onSave={handleSave} />}
        {tab === 'history' && <HistoryScreen meals={meals} goal={goal} onAdd={() => setTab('log')} />}
        {tab === 'profile' && <ProfileScreen goal={goal} setGoal={setGoal} />}
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

Notes the implementer must preserve: `mockMeals` import is gone; `goal` untouched; FAB, tabs, and `HistoryScreen`/`ProfileScreen` props unchanged.

- [ ] **Step 2: Commit**

```bash
git add App.js
git commit -m "feat(frontend): dashboard loads real week data with retry and optimistic mutations"
```

---

### Task 5: Header logo removal + per-day rings

**Files:**
- Modify: `E:\Caly Ai\caly-ai-frontend\src\screens\DashboardScreen.js`
- Modify: `E:\Caly Ai\caly-ai-frontend\src\components\dashboard\DaySelector.js`
- Test: device check in Task 6 (title-only header; ring per day matches `calcTotals`)

**Interfaces:**
- Consumes: `meals`, `goal`, `loading`, `error`, `onRetry` props (Task 4); `calcTotals`, `dateKey`, `ProgressRing`.
- Produces: `totalsByDate` map (`YYYY-MM-DD → calcTotals result`) passed to `DaySelector`.

- [ ] **Step 1: Edit `DashboardScreen.js`**

  a. Change the import block: remove `Image` from the `react-native` import; delete `import { mockStats } ...` line; add after the imports:
  ```js
  const tokens = require('../theme/tokens.js');
  ```
  b. Change the signature to:
  ```js
  export default function DashboardScreen({ meals = [], goal = 2000, loading = false, error = null, onRetry, onAdd, onDelete }) {
  ```
  c. After the `t` declaration, add:
  ```js
  const totalsByDate = useMemo(() => {
    const grouped = {};
    for (const m of meals) {
      const k = dateKey(m.loggedAt);
      if (!k) continue;
      (grouped[k] ||= []).push(m);
    }
    const out = {};
    for (const [k, list] of Object.entries(grouped)) out[k] = calcTotals(list, goal);
    return out;
  }, [meals, goal]);
  ```
  d. Delete the logo block (lines 42–44):
  ```jsx
  <View className="w-8 h-8 rounded-full overflow-hidden bg-white border border-[#F1E8E0] items-center justify-center">
    <Image source={require('../../assets/splash-logo.png')} style={{ width: 24, height: 24 }} resizeMode="contain" />
  </View>
  ```
  e. Delete the streak badge block (lines 47–50):
  ```jsx
  <View className="flex-row items-center bg-white border border-[#F1E8E0] rounded-full px-3 py-1.5" style={{ gap: 4 }}>
    <Text className="text-xs">🔥</Text>
    <Text className="text-sm font-bold text-ink">{mockStats.streak}</Text>
  </View>
  ```
  f. Change the `DaySelector` usage to:
  ```jsx
  <DaySelector selected={selectedDate} onSelect={setSelectedDate} totalsByDate={totalsByDate} goal={goal} />
  ```
  g. At the top of the returned content (inside the maxWidth `View`, before the header row), insert loading/error states:
  ```jsx
  {loading && meals.length === 0 && (
    <View className="items-center justify-center py-16">
      <ActivityIndicator size="large" color={tokens.colors.primary} />
      <Text className="text-sm text-muted mt-3">Loading your week…</Text>
    </View>
  )}
  {error && meals.length === 0 && !loading && (
    <Card style={{ marginTop: 4 }}>
      <Text className="font-bold text-ink mb-1">Couldn't load meals</Text>
      <Text className="text-sm text-muted mb-3">{error}</Text>
      <PrimaryButton title="Retry" onPress={onRetry} />
    </Card>
  )}
  ```
  h. Add `ActivityIndicator` to the `react-native` import and `import PrimaryButton from '../components/ui/Button';` to the imports.

- [ ] **Step 2: Edit `DaySelector.js`** — full new file content (replaces current file):

```js
import { ScrollView, Pressable, Text, View } from 'react-native';
import { dateKey } from '../../utils/format';
import ProgressRing from '../ui/ProgressRing';
const tokens = require('../../theme/tokens.js');

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function buildWeek(reference) {
  const start = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate() - reference.getDay());
  return Array.from({ length: 7 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

export default function DaySelector({ selected, onSelect, totalsByDate = {}, goal = 2000 }) {
  const today = new Date();
  const days = buildWeek(today);
  const todayKey = dateKey(today);
  const selectedKey = dateKey(selected);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
      {days.map(d => {
        const key = dateKey(d);
        const isSelected = key === selectedKey;
        const isToday = key === todayKey;
        const eaten = (totalsByDate[key] && totalsByDate[key].eaten) || 0;
        return (
          <Pressable
            key={key}
            onPress={() => onSelect(d)}
            className={`items-center rounded-card px-3 py-2 min-w-[44px] ${
              isSelected ? 'bg-primary' : isToday ? 'bg-white border border-[#F1E8E0]' : 'bg-transparent'
            }`}
          >
            <Text className={`text-[11px] ${isSelected ? 'text-white/80' : 'text-muted'}`}>{DAY_LABELS[d.getDay()]}</Text>
            <Text className={`text-sm font-bold mt-0.5 ${isSelected ? 'text-white' : 'text-ink'}`}>{d.getDate()}</Text>
            <View className="mt-1.5">
              <ProgressRing
                eaten={eaten}
                goal={goal}
                size={36}
                strokeWidth={4}
                color={isSelected ? '#FFFFFF' : tokens.colors.primary}
                trackColor={isSelected ? 'rgba(255,255,255,0.35)' : tokens.colors.border}
              />
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/screens/DashboardScreen.js src/components/dashboard/DaySelector.js
git commit -m "feat(frontend): title-only header and per-day progress rings"
```

---

### Task 6: Remove mocks, disable mock estimate, verify everything

**Files:**
- Delete: `E:\Caly Ai\caly-ai-frontend\src\lib\mockMeals.js`
- Modify: `E:\Caly Ai\caly-ai-frontend\src\screens\LogFoodScreen.js`
- Test: `npx expo-doctor`, `npx expo export --platform android`, device checklist below

**Interfaces:**
- Consumes: everything from Tasks 1–5.
- Produces: no references to `mockMeals` anywhere (`grep` must be clean).

- [ ] **Step 1: Edit `LogFoodScreen.js`** — remove the mock estimate, keep manual entry byte-identical:
  a. Delete line 6 (`import { estimateMock } from '../lib/mockMeals';`).
  b. Delete line 9 (`const [aiText, setAiText] = useState('');`), line 10 (`const [est, setEst] = useState(null);`), line 14 (`const canEstimate = ...`).
  c. Replace the AI card block (lines 19–25) with:
  ```jsx
  <Card>
    <Text className="font-bold text-ink mb-2">AI estimate</Text>
    <PrimaryButton title="Estimate" disabled onPress={() => {}} />
    <Text className="text-muted mt-2">AI estimate coming soon — use manual entry below</Text>
  </Card>
  ```
  (The `{est && ...}` line 24 is deleted with the block; the unused `TextInput` import stays — it is still used by manual entry.)

- [ ] **Step 2: Delete the mock file and prove zero references**

```bash
Remove-Item "src\lib\mockMeals.js"
```
Run: `grep -r "mockMeals\|mockStats\|estimateMock" --include="*.js" src App.js index.js lib` (workdir `E:\Caly Ai\caly-ai-frontend`; use `grep` tool, not bash, if available)
Expected: no matches.

- [ ] **Step 3: Static verification**

Run: `npx expo-doctor` (workdir `E:\Caly Ai\caly-ai-frontend`)
Expected: `21/21 checks passed. No issues detected!`
Run: `npx expo export --platform android --output-dir "$env:TEMP\caly-meals-verify"` then delete the dir
Expected: `Android Bundled ... index.js` with no errors.

- [ ] **Step 4: Device verification** (backend `npm run dev` running; app via `npx expo start --tunnel`)
  - [ ] Launch: week loads (or empty-state card on a fresh DB), header shows "Caly AI" text only, no logo, no streak badge.
  - [ ] Log a meal via `+` → manual entry → Save: appears in "Recently uploaded", today's ring advances, totals match `kcal` entered.
  - [ ] Select another day block: list filters to that day; every block shows a ring; empty days show an empty track.
  - [ ] Reload the app: the logged meal persists (proves backend round-trip).
  - [ ] Stop the backend, reload: retry card appears with the backend error; press Retry after restarting backend → data loads.

- [ ] **Step 5: Commit**

```bash
git add -A src App.js lib
git commit -m "feat(frontend): remove mocks, disable mock AI estimate"
```
