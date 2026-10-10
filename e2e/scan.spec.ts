import { test, expect } from '@playwright/test';
import { gotoApp, snap } from './helpers';

// Frontend-driven scan test: the app's own code path (camera screen ->
// gallery upload -> /api/scan AI -> result sheet with preview + calories
// -> Save -> meal in diary). No direct API calls except login + cleanup.
test('photo scan logs a meal with preview and calories', async ({ page }) => {
  test.setTimeout(180_000);
  const apiCalls: { url: string; status: number }[] = [];
  let savedMealName = '';
  page.on('response', async (r) => {
    if (!r.url().includes('/api/')) return;
    apiCalls.push({ url: r.url(), status: r.status() });
    // Capture what the app itself saved, so the diary assertion uses the
    // AI-chosen name instead of guessing it.
    if (r.url().includes('/api/meals') && r.request().method() === 'POST') {
      try {
        savedMealName = (await r.json()).meal?.name ?? '';
      } catch {
        // ignore body parse races
      }
    }
  });
  const consoleErrors: string[] = [];
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    // Missing favicon is static-asset noise, not an app error.
    if (m.text().includes('ERR_FILE_NOT_FOUND') && m.location().url?.includes('favicon')) return;
    consoleErrors.push(m.text().slice(0, 300));
  });
  page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${String(e).slice(0, 300)}`));
  const dialogs: string[] = [];
  const failedRequests: string[] = [];
  page.on('requestfailed', (r) => {
    // Dev-server HMR/navigation aborts are noise, not app failures.
    if (r.url() === 'http://localhost:8082/' && r.failure()?.errorText === 'net::ERR_ABORTED') return;
    failedRequests.push(`${r.url().slice(0, 160)} :: ${r.failure()?.errorText}`);
  });
  page.on('dialog', (d) => {
    dialogs.push(`${d.type()}: ${d.message().slice(0, 200)}`);
    d.dismiss().catch(() => {});
  });
  // Headless Chromium has no camera: grant it so the scan screen renders
  // its mode chips instead of the permission wall.
  await page.context().grantPermissions(['camera']);

  // Login like a real user
  await gotoApp(page, '/login');
  await page.getByPlaceholder('Enter your email').fill('test@caly.ai');
  await page.getByPlaceholder('Enter your password').fill('Test1234!');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 30_000 });

  // Open quick log -> Scan (the same taps a user makes)
  await page.getByLabel('Log food').click();
  await page.getByLabel('Scan').click();
  await expect(page.getByText('Library', { exact: true })).toBeVisible({ timeout: 20_000 });

  // Gallery pick: real Nutella jar photo through the app's file picker
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByText('Library', { exact: true }).click(),
  ]);
  await chooser.setFiles('e2e/fixtures/food-nutella.jpg');

  // AI result sheet: photo preview + calories + Save (the log-meal sheet)
  await expect(page.getByText('Scan complete')).toBeVisible({ timeout: 120_000 });
  await expect(page.getByText(/Detected foods \(\d+\)/)).toBeVisible();
  await expect(page.getByText('Totals (editable above)')).toBeVisible();
  const saveButton = page.getByRole('button', { name: /Save meal — \d+ kcal/ });
  await expect(saveButton).toBeVisible();
  await snap(page, '20-scan-result');

  // Save -> sheet closes, meal lands in today's diary (Home tab)
  await saveButton.click();
  await expect(page.getByText('Scan complete')).toBeHidden({ timeout: 30_000 });
  expect(savedMealName.length).toBeGreaterThan(0);
  await page.getByText('Home', { exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
  await expect(page.getByText(savedMealName).first()).toBeVisible({ timeout: 20_000 });

  console.log('API-CALLS ' + JSON.stringify(apiCalls));
  console.log('DIALOGS ' + JSON.stringify(dialogs));
  console.log('FAILED-REQUESTS ' + JSON.stringify(failedRequests));
  console.log('CONSOLE-ERRORS ' + JSON.stringify(consoleErrors.slice(0, 10)));
  expect(consoleErrors).toEqual([]);

  // Cleanup: remove what this test logged so seeded data stays pristine
  const login = await page.request.post('http://localhost:5000/api/auth/login', {
    data: { email: 'test@caly.ai', password: 'Test1234!' },
  });
  const { token } = await login.json();
  const auth = { Authorization: `Bearer ${token}` };
  const today = new Date().toISOString().slice(0, 10);
  const list = await (
    await page.request.get(`http://localhost:5000/api/meals?from=${today}&to=${today}`, { headers: auth })
  ).json();
  for (const m of list.meals.filter((x: any) => x.name === savedMealName)) {
    await page.request.delete(`http://localhost:5000/api/meals/${m.id}`, { headers: auth });
  }
});
