import { test, expect, type Page } from '@playwright/test';
import { gotoApp, snap } from './helpers';

async function scrollProgressTo(page: Page, where: 'top' | 'bottom') {
  await page.evaluate((pos) => {
    document.querySelectorAll('div').forEach((el) => {
      const cs = getComputedStyle(el);
      if (cs.overflowY === 'auto' && el.scrollHeight - el.clientHeight > 50) {
        (el as HTMLElement).scrollTop = pos === 'bottom' ? el.scrollHeight : 0;
      }
    });
  }, where);
}

async function scrollerState(page: Page) {
  return page.evaluate(() => {
    const out: any[] = [];
    document.querySelectorAll('div').forEach((el) => {
      const cs = getComputedStyle(el);
      if (cs.overflowY === 'auto' && el.scrollHeight - el.clientHeight > 50) {
        out.push({ scrollTop: el.scrollTop, max: el.scrollHeight - el.clientHeight });
      }
    });
    return out;
  });
}

// Real-user path: login via UI, open Progress tab, capture API + console evidence.
test('progress shows real data and bottom content stays reachable', async ({ page }) => {
  const apiCalls: { url: string; status: number }[] = [];
  page.on('response', (r) => {
    if (r.url().includes('/api/')) apiCalls.push({ url: r.url(), status: r.status() });
  });
  const consoleErrors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300));
  });
  page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${String(e).slice(0, 300)}`));

  // Login like a real user (test@caly.ai has seeded weights + meals)
  await gotoApp(page, '/login');
  await page.getByPlaceholder('Enter your email').fill('test@caly.ai');
  await page.getByPlaceholder('Enter your password').fill('Test1234!');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 30_000 });

  // Open Progress tab (BottomNav Pressables expose no button role on web — click the label)
  await page.getByText('Progress', { exact: true }).click();
  await expect(page).toHaveURL(/\/history$/, { timeout: 15_000 });
  await expect(page.getByText('Your Weight').first()).toBeVisible({ timeout: 20_000 });
  // Seeded weight renders its real value, not the empty dash
  await expect(page.getByText('100% of goal')).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(4000); // let weights + range meals revalidate
  await snap(page, '10-progress-top');

  // Bottom content must be scroll-reachable (guards the behind-the-nav regression).
  // With the measured tab height wired into bottomOffset, the scroll range
  // grows by ~the nav height (was 164 with the dead 0 wiring).
  await scrollProgressTo(page, 'bottom');
  const after = await scrollerState(page);
  console.log('SCROLLER ' + JSON.stringify(after));
  expect(after.length).toBeGreaterThan(0);
  expect(after[0].max).toBeGreaterThan(200);
  expect(after[0].scrollTop).toBe(after[0].max);
  await page.screenshot({ path: 'e2e/11-progress-bottom.png' });
  // Daily-average card (screen tail) is visible once scrolled to max
  await expect(page.getByText(/over \d+ logged days?/)).toBeVisible();

  console.log('API-CALLS ' + JSON.stringify(apiCalls));
  console.log('CONSOLE-ERRORS ' + JSON.stringify(consoleErrors.slice(0, 10)));
  expect(consoleErrors).toEqual([]);
});
