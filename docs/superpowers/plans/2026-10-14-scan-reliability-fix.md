# Scan Reliability Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the false "Couldn't connect to the server" scan failure and fix every exact error point found in the 2026-10-14 scan audit, verified by real tests.

**Architecture:** Fix at the source in each layer — explicit timeout flagging in the API client (no platform message sniffing), correct upstream-reachable accounting in the barcode route, fail-fast SMTP with non-blocking auth responses, a verify-guidance branch for 403s, and Render ops (TRUST_PROXY, keep-warm). No new features, no new dependencies.

**Tech Stack:** Expo SDK 57 / React Native 0.86 (frontend), Node 18+ / Express 5 / Mongoose / Zod / Nodemailer (backend), node:test for all new tests.

**Spec:** No separate spec doc — this plan implements the 2026-10-14 scan audit findings (source: live tests against Render + local backend; backend warm and reachable, local E2E all green, screenshot error traced to `connectionError` in `api.js`). Background for each task is stated in the task itself.

## Global Constraints

- Two separate repos, NO root git: `E:\Caly Ai\caly-ai-frontend\` and `E:\Caly Ai\caly-ai-backend\`. NEVER run git in `E:\Caly Ai\`.
- After EVERY task, inside the repo you changed: `git status --short --branch`, then `git add .` (NEVER `-f` secrets: `.env*`, `test-token.txt`, `*.key`, `*.pem`, `*.p12`), then `git status` to confirm staged.
- NEVER `git reset --hard`, `git checkout .`, `git clean -fd`, or `git stash` unless the user explicitly asked.
- Frontend: `npx expo lint` and `npx tsc --noEmit` must pass before declaring done. Use `npx expo install <pkg>`, never add native deps (none needed here).
- Backend: `npm test` must pass before declaring done.
- No new dependencies in either repo. Deletion beats addition; smallest diff that fully fixes.

## Review Focus

- Airplane mode toggled mid-upload then Cancel tapped: no error dialog may appear (caller-abort stays silent).
- Backend returns 503 (no vision key): scan still resolves to the placeholder estimate, never a failure dialog.
- 12 MB photo selected: backend 413 surfaces as a readable message, upload does not hang.
- Photo with no food: result sheet opens with zeros (noFood), never an alert dead end.
- Mid-scan 401: session is cleared and user is routed to sign-in with an explanation, never a retry loop.

---

### Task 1: Harden API_URL (trim stray whitespace)

**Files:**
- Modify: `caly-ai-frontend/.env` (remove trailing space)
- Modify: `caly-ai-frontend/src/shared/lib/api.js:8` (add `.trim()`)
- Test: `caly-ai-frontend/src/shared/utils/scan-flow.test.js` (append new `it` block)

**Interfaces:**
- Consumes: `process.env.EXPO_PUBLIC_API_URL` (string, may contain stray whitespace)
- Produces: `API_URL` (string, never has leading/trailing whitespace) imported by `scanApi.js`, `authApi.js`, all screens

- [ ] **Step 1: Write the failing test**

Append to `scan-flow.test.js` inside the top-level `describe`:

```js
it('API_URL trims stray whitespace from EXPO_PUBLIC_API_URL', () => {
  const api = read('shared/lib/api.js');
  assert.match(api, /EXPO_PUBLIC_API_URL[^;]*\.trim\(\)/, 'API_URL must trim the env value so a trailing space cannot poison every URL');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (workdir `caly-ai-frontend/`): `node --test src/shared/utils/scan-flow.test.js`
Expected: FAIL on `API_URL trims stray whitespace` with "API_URL must trim the env value".

- [ ] **Step 3: Write minimal implementation**

In `src/shared/lib/api.js:8`, change:

```js
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';
```

to:

```js
export const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000').trim();
```

Also remove the trailing space in `.env` so the file reads `EXPO_PUBLIC_API_URL=https://caly-ai-backend.onrender.com` with no trailing space.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/shared/utils/scan-flow.test.js`
Expected: PASS (all tests, including the new one).

- [ ] **Step 5: Commit**

```bash
git status --short --branch
git add .
git status
git commit -m "fix(scan): trim API_URL so stray whitespace cannot break fetch"
```

---

### Task 2: Explicit timeout flag in authedFetch (kill the UNREACHABLE misreport)

**Files:**
- Modify: `caly-ai-frontend/src/shared/lib/api.js:27-56,149-174` (`isTimeoutCause` kept as fallback; `authedFetch` gains a `didTimeout` flag)
- Test: `caly-ai-frontend/src/shared/utils/scan-flow.test.js` (append two `it` blocks)

**Interfaces:**
- Consumes: `options.timeoutMs`, `options.signal` (caller abort)
- Produces: thrown errors with `err.timeout === true` + `err.code === 'TIMEOUT_WAKE'` whenever OUR timer fired, regardless of platform abort message. `err.network === true` + `code === 'UNREACHABLE'` only for genuine pre-response failures.

- [ ] **Step 1: Write the failing tests**

```js
it('authedFetch flags our own timer abort as timeout (not message sniffing)', () => {
  const api = read('shared/lib/api.js');
  assert.match(api, /didTimeout/, 'timer must set an explicit flag when it fires');
  assert.match(api, /if \(didTimeout\)/, 'abort after our timer fired must be classified as timeout');
});

it('genuine connection failures still report UNREACHABLE', () => {
  const api = read('shared/lib/api.js');
  assert.match(api, /UNREACHABLE/, 'non-timeout network failures must keep the UNREACHABLE code');
  assert.match(api, /err\.timeout = true|timeout:\s*true/, 'timeout errors must carry timeout=true for the wake-up dialog');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test src/shared/utils/scan-flow.test.js`
Expected: FAIL on the `didTimeout` test ("timer must set an explicit flag").

- [ ] **Step 3: Write minimal implementation**

In `authedFetch` (`src/shared/lib/api.js:149-174`), track the timer explicitly:

```js
export async function authedFetch(path, options = {}) {
  const id = newReportId();
  const ctrl = new AbortController();
  let didTimeout = false;
  const timer = setTimeout(() => {
    didTimeout = true;
    ctrl.abort();
  }, options.timeoutMs || REQUEST_TIMEOUT_MS);
  const { timeoutMs: _timeoutMs, signal: externalSignal, ...fetchOptions } = options;
  if (externalSignal) {
    if (externalSignal.aborted) ctrl.abort();
    else externalSignal.addEventListener('abort', () => ctrl.abort(), { once: true });
  }
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...fetchOptions,
      headers: { ...(await authHeaders()), 'X-Request-Id': id, ...(options.headers || {}) },
      signal: ctrl.signal,
    });
  } catch (e) {
    // didTimeout wins over message sniffing: on RN Android an abort
    // rejects with generic "Network request failed", which contains no
    // abort/cancel substring. Caller-cancel (externalSignal) leaves
    // didTimeout false, so Cancel stays silent via the caller's own check.
    if (didTimeout) {
      e = e || new Error('timeout');
      e.timeout = true;
    }
    throw connectionError(id, options.method || 'GET', path, e);
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 401) await handleUnauthorized();
  return res;
}
```

And in `connectionError`, check the explicit flag first:

```js
function connectionError(id, method, path, cause) {
  const timedOut = cause?.timeout === true || isTimeoutCause(cause);
  ...
}
```

(change only the `timedOut` line; keep the rest of the function identical).

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test src/shared/utils/scan-flow.test.js`
Expected: PASS all. Then run lint: `npx expo lint` (expect clean for touched files).

- [ ] **Step 5: Commit**

```bash
git status --short --branch
git add .
git status
git commit -m "fix(scan): classify our own fetch timeout as TIMEOUT_WAKE on any platform"
```

---

### Task 3: scanApi cleanup — dead log line + coded barcode errors

**Files:**
- Modify: `caly-ai-frontend/src/shared/lib/scanApi.js:55-62` (log before throw), `caly-ai-frontend/src/shared/lib/scanApi.js:121-140` (barcode errors carry `status` + `code`)
- Test: `caly-ai-frontend/src/shared/utils/scan-flow.test.js` (append two `it` blocks)

**Interfaces:**
- Consumes: `authedFetch` responses
- Produces: `scanImage` / `lookupBarcode` errors with `err.status` (number) and `err.code` (`UNAUTHORIZED` for 401, `HTTP_4xx`/`HTTP_5xx` otherwise) so the screen can branch on codes, never messages

- [ ] **Step 1: Write the failing tests**

```js
it('scanImage logs retry-exhaustion instead of dead code after throw', () => {
  const scanApi = read('shared/lib/scanApi.js');
  assert.doesNotMatch(scanApi, /throw error;\s*\n\s*console\.log/, 'console.log after throw never runs');
});

it('barcode failures carry status and code for dialog branching', () => {
  const scanApi = read('shared/lib/scanApi.js');
  const fn = /export async function lookupBarcode[\s\S]*?\n}/.exec(scanApi);
  assert.ok(fn, 'lookupBarcode missing');
  assert.match(fn[0], /\.status\s*=/, 'barcode error must carry HTTP status');
  assert.match(fn[0], /\.code\s*=/, 'barcode error must carry a taxonomy code');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test src/shared/utils/scan-flow.test.js`
Expected: FAIL on both new tests.

- [ ] **Step 3: Write minimal implementation**

Fix the dead log (`scanApi.js:58-62`):

```js
  } catch (error) {
    // Log BEFORE throwing — anything after throw never runs.
    console.warn('[scanApi] scanImage retries exhausted:', error?.message || error);
    throw error;
  }
```

Give barcode errors status + code (`scanApi.js:130-138`):

```js
  if (!res.ok) {
    let errorMessage = data.error || `barcode lookup failed: ${res.status}`;
    if (errorMessage && errorMessage.includes('model does not support image input')) {
      errorMessage = 'The image format is not supported. Please try a different image or format.';
    } else if (errorMessage && errorMessage.includes('Cannot read')) {
      errorMessage = 'Unable to process the image. Please ensure the image is clear and try again.';
    }
    const httpErr = new Error(errorMessage);
    httpErr.status = res.status;
    httpErr.code = res.status === 401 ? 'UNAUTHORIZED' : res.status >= 500 ? 'HTTP_5xx' : 'HTTP_4xx';
    throw httpErr;
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test src/shared/utils/scan-flow.test.js` then `npx expo lint`.
Expected: PASS all, lint clean.

- [ ] **Step 5: Commit**

```bash
git status --short --branch
git add .
git status
git commit -m "fix(scan): log retry exhaustion and code barcode errors"
```

---

### Task 4: Scan screen handles 403-unverified with verify guidance

**Files:**
- Modify: `caly-ai-frontend/src/features/scan/screens/PictureUploadScreen.js:160-196` (add 403 branch; wake-up branch now triggers correctly via Task 2's `timeout` flag)
- Modify: `caly-ai-frontend/src/shared/lib/api.js:58-76` (`parseError` must attach `data` on 4xx — verify it does; if `err.data` is missing, add `err.data = data`)
- Test: `caly-ai-frontend/src/shared/utils/scan-flow.test.js` (append one `it` block)

**Interfaces:**
- Consumes: thrown scan errors with `{ status, code, data?: { needsVerification? } }`
- Produces: 403 + `needsVerification` shows a "Verify your email" dialog (resend guidance, NO Retry button); 401 keeps current session-expired dialog; timeouts keep the wake-up dialog

- [ ] **Step 1: Write the failing test**

```js
it('scan failures guide unverified accounts to verify instead of retrying', () => {
  const upload = read('features/scan/screens/PictureUploadScreen.js');
  assert.match(upload, /needsVerification/, '403 unverified must be detected via needsVerification');
  assert.match(upload, /Verify your email|verify your email/i, 'unverified users need verify guidance, not a retry loop');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/shared/utils/scan-flow.test.js`
Expected: FAIL ("403 unverified must be detected").

- [ ] **Step 3: Write minimal implementation**

In the `catch (_e)` block, after the existing `UNAUTHORIZED` branch, insert:

```js
        // Verified-only endpoints (scan) return 403 + needsVerification
        // for skip-verification accounts. Retrying can never succeed —
        // route the user to verify instead.
        if (_e?.status === 403 && _e?.data?.needsVerification) {
          Alert.alert(
            'Verify your email',
            'Scanning unlocks after email verification. Check your inbox for the code, then verify and scan again.',
          );
          return;
        }
```

Check `parseError` in `api.js` attaches the body on 4xx: it already sets `err.data = data` (line 73). If your read shows otherwise, add it — the branch above depends on `_e.data.needsVerification`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test src/shared/utils/scan-flow.test.js`, then `npx expo lint` and `npx tsc --noEmit`.
Expected: PASS all; lint and typecheck clean.

- [ ] **Step 5: Commit**

```bash
git status --short --branch
git add .
git status
git commit -m "fix(scan): guide unverified accounts to verify instead of retry loop"
```

---

### Task 5: Backend barcode — 404 for unknown product, 502 only when OFF unreachable

**Files:**
- Modify: `caly-ai-backend/src/routes/scan.routes.js:190-211` (extract `lookupOffProduct`, fix `upstreamOk`)
- Modify: `caly-ai-backend/src/routes/scan.routes.test.js` (append `describe` block)
- Export: add `lookupOffProduct` to `module.exports.scanHelpers`

**Interfaces:**
- Consumes: `lookupOffProduct(candidates: string[], fetchFn?: typeof fetch) => Promise<{ upstreamOk: boolean, data: object | null }>` — `fetchFn` injectable for tests, defaults to global `fetch`
- Produces: route returns 404 `product not found` when OFF answered (any HTTP status) without a product; 502 `barcode lookup failed` ONLY when every attempt threw (network failure)

- [ ] **Step 1: Write the failing test**

Append to `src/routes/scan.routes.test.js`:

```js
const { scanHelpers: scanHelpers2 } = require('./scan.routes');

describe('lookupOffProduct (upstream accounting)', () => {
  const { lookupOffProduct } = scanHelpers2;

  it('treats an upstream 404 as reachable (product missing, not lookup failed)', async () => {
    const notFound = { ok: false, status: 404, json: async () => ({ status: 0 }) };
    const out = await lookupOffProduct(['0000000000000'], async () => notFound);
    assert.equal(out.upstreamOk, true);
    assert.equal(out.data, null);
  });

  it('returns product data on 200 with status 1', async () => {
    const product = { product_name: 'X', nutriments: {} };
    const ok = { ok: true, status: 200, json: async () => ({ status: 1, product }) };
    const out = await lookupOffProduct(['3017620422003'], async () => ok);
    assert.equal(out.upstreamOk, true);
    assert.equal(out.data.product, product);
  });

  it('reports unreachable only when every attempt throws', async () => {
    const out = await lookupOffProduct(['3017620422003', '03017620422003'], async () => { throw new Error('boom'); });
    assert.equal(out.upstreamOk, false);
    assert.equal(out.data, null);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (workdir `caly-ai-backend/`): `node --test src/routes/scan.routes.test.js`
Expected: FAIL with "lookupOffProduct is not a function" (or not exported).

- [ ] **Step 3: Write minimal implementation**

In `scan.routes.js`, extract the loop (replacing lines 199-210) with:

```js
// Any HTTP answer (even 404) proves OpenFoodFacts is reachable; only a
// thrown fetch (network/timeout) means unreachable. Injectable fetchFn
// exists for unit tests — the route passes the global fetch.
async function lookupOffProduct(candidates, fetchFn = fetch) {
  let upstreamOk = false;
  let data = null;
  for (const candidate of candidates) {
    const offRes = await fetchFn(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(candidate)}.json?fields=product_name,brands,nutriments,serving_quantity,serving_unit`,
      { signal: AbortSignal.timeout(10000) }
    ).catch(() => null);
    if (!offRes) continue;
    upstreamOk = true;
    if (!offRes.ok) continue;
    data = await offRes.json().catch(() => null);
    if (data && data.status === 1 && data.product) break;
  }
  return { upstreamOk, data };
}
```

Route body becomes:

```js
    const candidates = code.length === 12 ? [code, `0${code}`] : [code];
    const { upstreamOk, data } = await lookupOffProduct(candidates);
```

(keep the existing `if (!upstreamOk) 502` / `if (!data...) 404` lines unchanged) and extend the export:

```js
module.exports.scanHelpers = { toNum, servingGrams, isImageBuffer, lookupOffProduct };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: all suites pass, including the 3 new tests.

- [ ] **Step 5: Commit**

```bash
git status --short --branch
git add .
git status
git commit -m "fix(scan): barcode returns 404 for unknown product, 502 only when OFF unreachable"
```

---

### Task 6: Backend SMTP fail-fast — auth never hangs when email is down

**Files:**
- Modify: `caly-ai-backend/src/services/mailer.js` (export `buildSmtpOptions()` with ≤10s timeouts; `sendMail` uses it)
- Modify: `caly-ai-backend/src/routes/auth.routes.js:62-96,100-124,127-152` (code save commits; email failure logged, response still returns with `emailSent: false`)
- Test: append `describe` to `caly-ai-backend/src/routes/scan.routes.test.js`? No — create `caly-ai-backend/src/services/mailer.test.js` with timeout assertions (repo `npm test` glob covers `src/services/*.test.js`)

**Interfaces:**
- Consumes: `SMTP_HOST/PORT/SECURE/USER/PASS` env
- Produces: `buildSmtpOptions() => { host, port, secure, auth?, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 10000 }`; `sendMail()` resolves/rejects within ~10s when SMTP is unreachable; auth responses include additive `emailSent: boolean` and never hang past one SMTP timeout

- [ ] **Step 1: Write the failing test**

Create `src/services/mailer.test.js`:

```js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { buildSmtpOptions } = require('./mailer');

describe('buildSmtpOptions (fail-fast SMTP)', () => {
  it('caps connection, greeting, and socket timeouts at 10 s', () => {
    const opts = buildSmtpOptions();
    assert.ok(opts.connectionTimeout <= 10000, 'connection can hang register past the 15 s client timeout');
    assert.ok(opts.greetingTimeout <= 10000, 'greeting can hang register past the 15 s client timeout');
    assert.ok(opts.socketTimeout <= 10000, 'idle socket can hang register past the 15 s client timeout');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/services/mailer.test.js`
Expected: FAIL with "buildSmtpOptions is not a function".

- [ ] **Step 3: Write minimal implementation**

In `mailer.js`, extract and cap:

```js
const SMTP_TIMEOUT_MS = 10000; // Render -> Gmail can black-hole; never hang a request past this per phase

function buildSmtpOptions() {
  return {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === '1',
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
    connectionTimeout: SMTP_TIMEOUT_MS,
    greetingTimeout: SMTP_TIMEOUT_MS,
    socketTimeout: SMTP_TIMEOUT_MS,
  };
}

function getTransporter() {
  if (!process.env.SMTP_HOST) return null;
  if (!transporter) transporter = nodemailer.createTransport(buildSmtpOptions());
  return transporter;
}
```

Export `buildSmtpOptions`. Then in `auth.routes.js`, make the three issuers non-fatal on email failure:

```js
// Saves the code, then tries email. Returns true when the email went out;
// a down SMTP must never fail (or hang past mailer timeouts) the request.
async function issuePendingCode(pending) {
  const code = generateCode();
  pending.codeHash = hashCode(code);
  pending.codeExpiresAt = codeExpiry();
  pending.codeAttempts = 0;
  await pending.save();
  try {
    await sendMail({
      to: pending.email,
      ...verificationEmail({ code, ttlMinutes: CODE_TTL_MINUTES }),
    });
    return true;
  } catch (e) {
    console.warn(`[auth] email send failed to=${pending.email}: ${e.message}`);
    return false;
  }
}
```

Apply the same try/catch-return-boolean shape to `issueVerifyCode` and `issueResetCode`, and include the result additively at each call site:

```js
// register:
const emailSent = await issuePendingCode(pending);
res.status(201).json({ requiresVerification: true, emailSent });
// login unverified/pending paths:
const emailSent = await issuePendingCode(pending); // or issueVerifyCode(user)
return res.status(403).json({ error: 'email not verified — a new code has been sent', needsVerification: true, emailSent });
// forgot-password: const emailSent = user ? await issueResetCode(user) : true; res.json({ ok: true, emailSent });
```

Keep every existing field and status code identical; only ADD `emailSent`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS all suites. Then live-check locally: boot server, `POST /api/auth/register` returns 201 with `emailSent` boolean in well under 15 s.

- [ ] **Step 5: Commit**

```bash
git status --short --branch
git add .
git status
git commit -m "fix(auth): SMTP fail-fast with 10s timeouts, auth responds even when email is down"
```

---

### Task 7: Render ops — TRUST_PROXY, SMTP, keep-warm (no code)

**Files:** none (dashboard + verify). If `CORS_ORIGINS` is unset in production, set it to the app origin at the same time.

**Interfaces:** none — this task produces a correctly configured Render service, verified by HTTP headers.

- [ ] **Step 1: Set `TRUST_PROXY=1` on the Render service**

Why: `app.js:12` only trusts one proxy when `TRUST_PROXY=1`; behind Render/Cloudflare with the current `0`, every phone shares one rate-limit bucket (`API_LIMIT=100/15min`), so scan bursts 429 innocent users. In the Render dashboard → service → Environment, add `TRUST_PROXY=1`, save (triggers redeploy).

- [ ] **Step 2: Fix SMTP on Render**

Either provide working SMTP env (`SMTP_HOST/PORT/USER/PASS` reachable from Render — Gmail on 587 black-holes from Render free; prefer a transactional provider) or leave `SMTP_HOST` empty so the server logs codes instead of hanging. After Task 6 the worst case is a 10 s delay with `emailSent: false`, but a working provider is the real fix. Verify: `POST /api/auth/register` with a fresh test email returns 201 in under 15 s.

- [ ] **Step 3: Add a keep-warm ping (optional but recommended)**

Render free sleeps after ~15 min idle; the first scan then eats a 30–50 s cold start inside the 60 s budget. Add a free UptimeRobot/cron ping to `GET /health` every 10 min. Verify: two `curl.exe` health checks 20 min apart both return in under 2 s with steadily increasing `uptime`.

- [ ] **Step 4: Verify rate limiting is per-user again**

Run: `curl.exe -i https://caly-ai-backend.onrender.com/health` twice, confirm `x-ratelimit-remaining` decrements per client IP behavior is sane and no `429` appears during a 5-scan burst from one phone. Record results in the final report. No commit (no code changed).

---

### Task 8: Full verification matrix + lint/typecheck/test gates

**Files:** none (verification only; fix anything found as a new task, do not bundle).

- [ ] **Step 1: Backend gates**

Run (workdir `caly-ai-backend/`): `npm test`
Expected: all suites PASS, including the new `lookupOffProduct` (3 tests) and `buildSmtpOptions` (1 test) suites.

- [ ] **Step 2: Frontend gates**

Run (workdir `caly-ai-frontend/`): `node --test src/shared/utils/scan-flow.test.js`, then `npx expo lint`, then `npx tsc --noEmit`.
Expected: all PASS / clean.

- [ ] **Step 3: Local E2E matrix (server on localhost:5000, verified user)**

For each row, record HTTP status + latency: barcode valid → 200; barcode bad format → 400; barcode unknown (12-digit `041220027208`) → 404 (was 502); scan no file → 400; scan text file → 400; scan real food photo → 200 with `items[]`; scan non-food photo → 422 + `noFood` sheet path; scan/image persist → 200 `imageUrl`; register fresh email → 201 fast with `emailSent` boolean.

- [ ] **Step 4: Render E2E matrix (warm service)**

`GET /health` → 200 <2 s; unauthenticated scan/barcode/image → 401; bad-login → 401; `resend-code` unknown → 200; register fresh → 201 <15 s; authenticated barcode valid → 200; authenticated scan photo → 200/422/503-placeholder (any HTTP answer = reachable; only a pushed `TIMEOUT_WAKE` on huge photos over slow links is acceptable and must show the wake-up dialog, never "Couldn't connect").

- [ ] **Step 5: Slow-link simulation**

Throttle to ~50 kbps (devtools or 10 MB photo on throttled link) and confirm: the wake-up dialog appears on timeout (not "Couldn't connect"), Cancel stays silent, and Retry-after-warm succeeds. Record results; declare the fix 100% only when every row above is green.

---

## Self-Review

1. **Spec coverage:** every audit point has a task — misclassified timeout (2), dead log + barcode codes (3), 403 verify UX (4), barcode 502 (5), SMTP hang (6), shared rate-limit bucket + cold start (7), API_URL hygiene (1), full matrix (8).
2. **Placeholder scan:** all steps carry exact file paths, commands, and code blocks; no TBD/TODO/适当 handling language.
3. **Type consistency:** `emailSent: boolean` additive everywhere; `lookupOffProduct(candidates, fetchFn?)` signature identical in code, export, and tests; `err.timeout/code/status` naming matches `apiErrors.js` taxonomy (`TIMEOUT_WAKE`, `UNREACHABLE`, `HTTP_4xx/5xx`, `UNAUTHORIZED`).
4. **Review Focus:** each of the five lines maps to an existing or new test — cancel-silence (existing cancellable test + Task 2), 503 placeholder (existing scanApi 503 test, untouched), 413 (backend `errorHandler` LIMIT_FILE_SIZE + Task 8 matrix row), 422 noFood (existing tests, untouched), 401 reroute (existing UNAUTHORIZED test + Task 4).

Plan complete and saved to `caly-ai-frontend/docs/superpowers/plans/2026-10-14-scan-reliability-fix.md`. Please review the plan. Which execution approach would you prefer?

- **Subagent-driven** - A fresh subagent implements each task and a fresh reviewer checks it before the next one starts, then a whole-branch review at the end. Most thorough; costs a fresh context per task and per review.
- **Native** - I implement every task myself in this session, then one fresh reviewer checks the whole branch. Cheapest and fastest; no independent review until the end.

For this plan I recommend **subagent-driven**, because tasks span two repos with shared interfaces (timeout flags, emailSent, status codes) where an independent reviewer per task best catches contract drift, and a shipped mistake here breaks the core paid-scan flow. Does the plan capture what you want, and which approach should we use?

Skipped: on-device testing on the vivo handset itself and Render server-log access (no credentials). Risk: Task 2's fix is validated by file-content tests plus slow-link simulation, not by the exact failing handset build.
