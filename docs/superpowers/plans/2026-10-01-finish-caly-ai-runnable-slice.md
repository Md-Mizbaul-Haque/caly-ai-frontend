# Finish Caly AI Runnable Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Caly AI end-to-end runnable with real auth and real backend (register → login → scan/log → dashboard → weights/goal).

**Architecture:** Keep two repos and current Express + Expo structure. Add one AuthScreen, wire existing authApi/tokenStore, fix photo passthrough, persist goal, hide non-core QuickLog items, fix one backend goal-echo line and add test script.

**Tech Stack:** Expo SDK 57, React 19.2.3, React-Native 0.86.3, NativeWind 4, Node CommonJS, Express 5.2.1, Mongoose 9.10.2, Zod 4.6.5, JWT + bcryptjs.

**Spec:** `E:\Caly Ai\caly-ai-frontend\docs\superpowers\specs\2026-10-01-finish-caly-ai-runnable-slice-design.md`

## Global Constraints

- Expo SDK 57 — use `npx expo install <pkg>` for native deps, never hand-edit `ios/`/`android/`.
- Backend stays CommonJS `require`, Express 5, `src/index.js` entry.
- `requireAuth` stays on all `/api/*` — 401 without JWT is correct.
- Do not add new backend services or new native dependencies in this slice.
- Run `npx expo lint` equivalent (`npx expo-doctor` per AGENTS.md guidance) before declaring frontend done; run `node --test` for backend validation test.

## Review Focus

- Expired/invalid JWT on `GET /api/meals?from=2026-09-28&to=2026-09-29` should reroute to Auth, not spin loader forever.
- `PUT /api/auth/profile {dailyGoalKcal: "abc"}` string should surface server 400 message, not crash Profile.
- `POST /api/meals {name:"", kcal:0}` should be blocked client-side and server 400, never create 0-kcal meal.
- `POST /api/scan` with no API key (503) must show labeled placeholder, never silently fake 400kcal.
- `DELETE /api/weights/invalid-id` must surface 400, not remove optimistic row permanently.

---

### Task 1: Auth gate + AuthScreen

**Files:**
- Create: `E:\Caly Ai\caly-ai-frontend\src\screens\AuthScreen.js`
- Modify: `E:\Caly Ai\caly-ai-frontend\App.js:15-16,35,55,181`
- Test: manual `npx expo start` register/login/verify flow (no automated runner in repo)

**Interfaces:**
- Consumes: `register(name,email,password)`, `login(email,password)`, `verifyEmail(email,code)`, `resendCode(email)`, `forgotPassword(email)`, `resetPassword(email,code,newPassword)`, `fetchMe()`, `setToken/getToken/setSessionExpiredHandler/handleUnauthorized` — all already exist.
- Produces: `AuthScreen({ onAuthed(user) })` — calls `onAuthed` with `{user}` after any flow that returns `{token,user}`; `App.js` exports no new API but gates tabs on `user != null`.

- [ ] **Step 1: Create AuthScreen with register/login/verify flows**

```js
import { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import Card from '../components/ui/Card';
import PrimaryButton from '../components/ui/Button';
import Chip from '../components/ui/Chip';
import { register, login, verifyEmail, resendCode, forgotPassword, resetPassword } from '../lib/authApi';
import { toastSuccess, toastError } from '../utils/toast';

const MODES = ['login', 'register', 'verify', 'forgot', 'reset'];

export default function AuthScreen({ onAuthed }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  async function run(fn, okMsg) {
    setBusy(true);
    try {
      const data = await fn();
      if (data && data.token) {
        toastSuccess('Welcome', okMsg);
        onAuthed(data.user);
      } else {
        toastSuccess('Check email', okMsg);
        if (mode === 'register' || mode === 'forgot') setMode(mode === 'register' ? 'verify' : 'reset');
      }
    } catch (e) {
      toastError('Auth failed', e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView className="flex-1 bg-cream px-4 pt-16">
      <Text className="text-2xl font-bold text-ink mb-4">Caly AI — Sign in</Text>
      <View className="flex-row mb-3">
        {MODES.map(m => <Chip key={m} label={m} active={mode===m} onPress={()=>setMode(m)} />)}
      </View>
      <Card>
        {(mode === 'register') && (
          <TextInput value={name} onChangeText={setName} placeholder="Name" className="bg-cream rounded-xl px-3 py-2 mb-2" />
        )}
        <TextInput value={email} onChangeText={setEmail} placeholder="Email" keyboardType="email-address" autoCapitalize="none" className="bg-cream rounded-xl px-3 py-2 mb-2" />
        {(mode === 'login' || mode === 'register') && (
          <TextInput value={password} onChangeText={setPassword} placeholder="Password (8+ chars)" secureTextEntry className="bg-cream rounded-xl px-3 py-2 mb-2" />
        )}
        {(mode === 'verify' || mode === 'reset') && (
          <TextInput value={code} onChangeText={setCode} placeholder="6-digit code" keyboardType="numeric" className="bg-cream rounded-xl px-3 py-2 mb-2" />
        )}
        {mode === 'login' && <PrimaryButton title={busy ? 'Signing in…' : 'Login'} disabled={busy || !email || !password} onPress={() => run(() => login(email.trim(), password), 'Signed in')} />}
        {mode === 'register' && <PrimaryButton title={busy ? 'Creating…' : 'Register'} disabled={busy || !name.trim() || !email || password.length < 8} onPress={() => run(() => register(name.trim(), email.trim(), password), 'Code sent — verify email')} />}
        {mode === 'verify' && <PrimaryButton title="Verify" disabled={busy || !email || code.length !== 6} onPress={() => run(() => verifyEmail(email.trim(), code.trim()), 'Verified')} />}
        {mode === 'forgot' && <PrimaryButton title="Send reset code" disabled={busy || !email} onPress={() => run(() => forgotPassword(email.trim()), 'Reset code sent')} />}
        {mode === 'reset' && <PrimaryButton title="Reset password" disabled={busy || !email || code.length !== 6 || password.length < 8} onPress={() => run(() => resetPassword(email.trim(), code.trim(), password), 'Password reset')} />}
        {(mode === 'verify') && <PrimaryButton title="Resend code" disabled={busy || !email} onPress={() => run(() => resendCode(email.trim()), 'Code resent')} />}
        {(mode === 'login') && <Text className="text-muted text-xs mt-2">Unverified login returns 403 + auto resend — check email, then use verify tab.</Text>}
      </Card>
    </ScrollView>
  );
}
```

- [ ] **Step 2: Wire App.js gate + session expiry + fetch goal from me**

```js
import AuthScreen from './src/screens/AuthScreen';
import { fetchMe } from './src/lib/authApi';
import { getToken, setSessionExpiredHandler } from './src/lib/tokenStore';

// inside App():
const [user, setUser] = useState(null);
const [authChecked, setAuthChecked] = useState(false);

useEffect(() => {
  let alive = true;
  (async () => {
    setSessionExpiredHandler(() => { if (alive) { setUser(null); } });
    const t = await getToken();
    if (!t) { if (alive) setAuthChecked(true); return; }
    try {
      const data = await fetchMe();
      if (alive) {
        setUser(data.user);
        if (data.user && data.user.dailyGoalKcal) setGoal(data.user.dailyGoalKcal);
      }
    } catch { if (alive) setUser(null); }
    finally { if (alive) setAuthChecked(true); }
  })();
  return () => { alive = false; };
}, []);

// render guard before tabs:
if (!authChecked) return null; // splash covers
if (!user) return (<SafeAreaProvider><SafeAreaView className="flex-1 bg-cream"><AuthScreen onAuthed={(u) => { setUser(u); if (u && u.dailyGoalKcal) setGoal(u.dailyGoalKcal); loadWeek(); }} /><ThemedToast /></SafeAreaView></SafeAreaProvider>);
```

- [ ] **Step 3: Manual verify auth reroute**

Run: `npx expo start` then register `test+<ts>@example.com` → verify with SMTP/dev log code → force 401 by clearing SecureStore → confirm AuthScreen reappears.
Expected: PASS — login persists after reload, 401 kicks to Auth.

- [ ] **Step 4: Commit**

```bash
git add src/screens/AuthScreen.js App.js
git commit -m "feat(frontend): add auth gate with verify/reset flows"
```

Workdir: `E:\Caly Ai\caly-ai-frontend`

---

### Task 2: Meals + Scan photo passthrough + LogFood macros

**Files:**
- Modify: `E:\Caly Ai\caly-ai-frontend\src\screens\LogFoodScreen.js:30-41`
- Modify: `E:\Caly Ai\caly-ai-frontend\App.js:89-125,173`
- Modify: `E:\Caly Ai\caly-ai-frontend\src\screens\ScanResultScreen.js:59-68`
- Test: manual log + scan save, check Dashboard MealRow shows macros

**Interfaces:**
- Consumes: `createMeal({name,kcal,protein,carbs,fat,mealType,loggedAt})` from `src/lib/mealsApi.js:21-24`, `onSave(meal)` from `App.js:89`.
- Produces: `onSave` now receives `{name,kcal,protein,carbs,fat,mealType,imageUrl?}`; `MealRow` already renders `meal.imageUrl`.

- [ ] **Step 1: Replace AI-estimate placeholder with macro inputs in LogFoodScreen**

```js
// Replace Card "AI estimate" block (lines 30-34) with nothing (delete).
// Replace manual card with:
const [protein, setProtein] = useState('');
const [carbs, setCarbs] = useState('');
const [fat, setFat] = useState('');
// canSave stays name + kcal>0; onSave:
onPress={() => onSave({
  name: name.trim(),
  kcal: Number(kcal),
  protein: Number(protein) || 0,
  carbs: Number(carbs) || 0,
  fat: Number(fat) || 0,
  mealType: type,
  ...(photo ? { imageUrl: photo } : {}),
})}
// Add three TextInputs:
<TextInput value={protein} onChangeText={setProtein} placeholder="protein g" keyboardType="numeric" className="bg-cream rounded-xl px-3 py-2 mb-2" />
<TextInput value={carbs} onChangeText={setCarbs} placeholder="carbs g" keyboardType="numeric" className="bg-cream rounded-xl px-3 py-2 mb-2" />
<TextInput value={fat} onChangeText={setFat} placeholder="fat g" keyboardType="numeric" className="bg-cream rounded-xl px-3 py-2 mb-2" />
```

- [ ] **Step 2: Fix handleSaveScan photo passthrough in App.js**

```js
function handleSaveScan(meal) {
  const imageUrl = scanResult && scanResult.imageUri ? scanResult.imageUri : (pendingPhoto || undefined);
  setScanResult(null);
  setPendingPhoto(imageUrl || null);
  handleSave(imageUrl ? { ...meal, imageUrl } : meal);
}
// handleSave already spreads ...meal into optimistic + createMeal, so imageUrl flows to API (backend ignores unknown fields safely) and to MealRow.
```

- [ ] **Step 3: Include imageUrl in ScanResultScreen handleSave**

```js
function handleSave() {
  onSave({
    name,
    kcal: Math.round(activeTotals.kcal),
    protein: Math.round(activeTotals.protein),
    carbs: Math.round(activeTotals.carbs),
    fat: Math.round(activeTotals.fat),
    mealType: type,
    ...(result.imageUri ? { imageUrl: result.imageUri } : {}),
  });
}
```

- [ ] **Step 4: Manual verify**

Run: `npx expo start`, log manual meal with `protein 10 carbs 20 fat 5`, scan test photo → edit kcal → save. Check Dashboard shows `10g Protein 20g Carbs 5g Fat` and photo thumbnail.
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/screens/LogFoodScreen.js src/screens/ScanResultScreen.js App.js
git commit -m "feat(frontend): manual macros plus scan photo passthrough"
```

Workdir: `E:\Caly Ai\caly-ai-frontend`

---

### Task 3: Goal persistence + Dashboard macros + QuickLog trim + Progress retry + weight delete

**Files:**
- Modify: `E:\Caly Ai\caly-ai-frontend\src\screens\ProfileScreen.js:7-26`
- Modify: `E:\Caly Ai\caly-ai-frontend\src\screens\DashboardScreen.js:15-19`
- Modify: `E:\Caly Ai\caly-ai-frontend\src\components\ui\QuickLogSheet.js:7-11,65-107`
- Modify: `E:\Caly Ai\caly-ai-frontend\src\screens\ProgressScreen.js:138-142`
- Modify: `E:\Caly Ai\caly-ai-frontend\App.js:174-180` (weight delete wiring)
- Test: manual goal save persists after reload; QuickLog shows 3 items; Progress error has Retry

**Interfaces:**
- Consumes: `updateProfile(dailyGoalKcal)` returns `{user}` (`src/lib/authApi.js:48-50`), `deleteWeight(id)` (`src/lib/weightsApi.js:14-17`).
- Produces: `ProfileScreen({goal,setGoal,onSaved})` persists; Dashboard derives macro targets; Progress accepts `onRetry`.

- [ ] **Step 1: Persist goal via updateProfile**

```js
import { updateProfile } from '../lib/authApi';
import { toastError } from '../utils/toast';
// replace onPress:
onPress={async () => {
  try {
    const data = await updateProfile(parsed);
    setGoal(data.user.dailyGoalKcal);
    toastSuccess('Goal updated', `${data.user.dailyGoalKcal} kcal per day`);
  } catch (e) { toastError('Could not save goal', e.message); }
}}
// validation: parsed must be 500..10000 to match backend User model:
const valid = Number.isFinite(parsed) && parsed >= 500 && parsed <= 10000;
{!valid && <Text className="text-red-500 mb-2">Enter 500–10000 kcal</Text>}
```

- [ ] **Step 2: Derive Dashboard macro targets from goal**

```js
// Replace const MACROS static targets with function:
function macroTargets(goal) {
  const kcalP = Math.round(goal * 0.25 / 4);
  const kcalC = Math.round(goal * 0.50 / 4);
  const kcalF = Math.round(goal * 0.25 / 9);
  return [
    { key: 'protein', label: 'Protein', target: kcalP, color: '#FF6B35', icon: Beef },
    { key: 'carbs', label: 'Carbs', target: kcalC, color: '#FACC15', icon: Wheat },
    { key: 'fat', label: 'Fat', target: kcalF, color: '#22C55E', icon: Droplet },
  ];
}
// inside component: const MACROS = macroTargets(goal);
// goal 2000 → protein 125, carbs 250, fat 55 (replaces hardcoded 120/250/65).
```

- [ ] **Step 3: Trim QuickLogSheet to core three**

```js
import { Camera, Scale, UtensilsCrossed } from './icons';
// Replace QUICK_ACTIONS with:
const QUICK_ACTIONS = [
  { key: 'food', label: 'Log Food', Icon: UtensilsCrossed, action: 'logFood' },
  { key: 'scan', label: 'Scan', Icon: Camera, action: 'scan' },
  { key: 'weight', label: 'Weight', Icon: Scale, action: 'weight' },
];
// Row onPress: key==='food' ? dismiss(onLogFood) : key==='scan' ? dismiss(onScan) : dismiss(onLogWeight)
// Delete the big "Log Food + remaining + search/mic" panel (lines 79-107), replace with:
<View className="mt-3 bg-cream rounded-2xl px-4 py-2.5">
  <Text className="text-muted text-xs text-center">{remaining} kcal remaining today</Text>
</View>
// Removes GlassWater/Dumbbell/Mic/Search + all 'Coming soon' toasts.
```

- [ ] **Step 4: Progress retry + weight delete wiring**

```js
// ProgressScreen: add onRetry prop, extract loader to useCallback, add button:
export default function ProgressScreen({ weights = [], weightGoal = null, onLogWeight, onRetry }) {
  // ... keep existing fetch in useEffect, add:
  {error && (
    <Card style={{ marginBottom: 12 }}>
      <Text className="text-danger text-sm mb-2">Could not load your activity. {error}</Text>
      <PrimaryButton title="Retry" onPress={onRetry} />
    </Card>
  )}
// App.js history tab:
{<ProgressScreen weights={weights} weightGoal={weightGoal} onLogWeight={() => setLogWeightOpen(true)} onRetry={loadWeek} />}
// Weight delete (App.js): add
import { deleteWeight } from './src/lib/weightsApi';
async function handleDeleteWeight(id) {
  const prev = weights;
  setWeights(w => w.filter(x => x.id !== id));
  try { await deleteWeight(id); } catch (e) { setWeights(prev); toastError("Couldn't delete", e.message); }
}
// Pass to ProgressScreen as onDeleteWeight and render a small Delete pressable per latest entry (or in WeightChart tooltip — minimal: long-press latest card).
```

Keep weight-delete UI minimal: add `onDeleteWeight` to the Your Weight card `Pressable` only when `latest && latest.id && !String(latest.id).startsWith('temp-')`.

- [ ] **Step 5: Manual verify**

Run: `npx expo start`, set goal 2500 → reload → still 2500; QuickLog shows only Log Food/Scan/Weight; kill backend → Progress shows Retry → restart → Retry loads.
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/screens/ProfileScreen.js src/screens/DashboardScreen.js src/components/ui/QuickLogSheet.js src/screens/ProgressScreen.js App.js
git commit -m "feat(frontend): persist goal, derive macros, trim quick log, retry weights"
```

Workdir: `E:\Caly Ai\caly-ai-frontend`

---

### Task 4: Backend test script + goal echo fix + final verify

**Files:**
- Modify: `E:\Caly Ai\caly-ai-backend\package.json:6-9`
- Modify: `E:\Caly Ai\caly-ai-backend\src\routes\weights.routes.js:66-77`
- Test: `node --test src/routes/meals.validation.test.js`

**Interfaces:**
- Consumes: `WeightGoal.findOneAndUpdate(..., {upsert:true, new:true})` already returns doc.
- Produces: `PUT /api/weights/goal` returns `{goal: <number from DB>}`; `npm test` runs validation suite.

- [ ] **Step 1: Add test script**

```json
"scripts": {
  "dev": "nodemon src/index.js",
  "start": "node src/index.js",
  "test": "node --test src/routes/meals.validation.test.js"
}
```

- [ ] **Step 2: Return DB doc from PUT /goal**

```js
router.put('/goal', async (req, res) => {
  const parsed = goalBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid goal', details: parsed.error.issues });
  }
  const doc = await WeightGoal.findOneAndUpdate(
    { userId: req.user.id },
    { value: parsed.data.value },
    { upsert: true, new: true }
  );
  res.json({ goal: doc.value });
});
```

- [ ] **Step 3: Run backend tests**

Run: `node --test src/routes/meals.validation.test.js`
Expected: PASS 5/5 (existing file `src/routes/meals.validation.test.js:1-35`).

- [ ] **Step 4: Final click-through M1-M7**

Run backend: `node src/index.js` (needs `MONGO_URI` in `.env`), run frontend `npx expo start`, then: register → verify → login → scan photo → save → dashboard totals update → log weight 180 → set goal 2200 → delete meal → reload persists.
Expected: all persist, no `Coming soon` in exercised paths.

- [ ] **Step 5: Commit backend**

```bash
git add package.json src/routes/weights.routes.js
git commit -m "fix(backend): return db goal plus test script"
```

Workdir: `E:\Caly Ai\caly-ai-backend`

---

## Self-Review

- Spec coverage: Auth gate (Task1) covers spec 3.1; meals/scan photo (Task2) covers 3.2; goal/macros/quicklog/retry/delete (Task3) covers 3.3; error/verify/commit (Task4) covers 5-6. Label pipeline distinct, Water/Exercise/Voice full, meal edit — explicitly out of scope, not tasked.
- Placeholder scan: no TBD/TODO, all steps have code + exact run + expected.
- Type consistency: `onSave({name,kcal,protein,carbs,fat,mealType,imageUrl?})` same in Task2 steps 1-3; `updateProfile(number)` returns `{user}` used in Task1+3; `PUT /goal` returns `{goal:number}` matches `setWeightGoal` consumer.
- Review Focus: each of the 5 lines has an owning test — 401 reroute (T1S3), profile 400 string (T3S1 try/catch + message), 0-kcal block (T2S1 canSave), 503 placeholder label (existing ScanResult banner, kept), weight delete 400 rollback (T3S4 try/catch restore).
