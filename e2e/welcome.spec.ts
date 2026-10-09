import { test, expect } from '@playwright/test';
import { gotoApp, snap } from './helpers';

test('welcome renders like a real user sees it', async ({ page }) => {
  await gotoApp(page, '/');
  await snap(page, '01-root');
  // Logged-out guard lands on /welcome; tolerate either
  await expect(page).toHaveURL(/\/(welcome)?$/);
  await expect(page.getByLabel('Caly AI logo')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
  await snap(page, '02-welcome');
});

test('login route renders CTA', async ({ page }) => {
  await gotoApp(page, '/login');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText('Welcome back! Good to see you again!')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
  await snap(page, '03-login');
});
