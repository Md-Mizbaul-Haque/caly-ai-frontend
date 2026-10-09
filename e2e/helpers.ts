import { Page } from '@playwright/test';

export async function gotoApp(page: Page, path = '/') {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  // RouteGuard may redirect / -> /welcome for logged-out user
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
}

export async function snap(page: Page, name: string) {
  await page.screenshot({ path: `e2e/${name}.png`, fullPage: true });
}
