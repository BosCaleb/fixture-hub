import { test, expect } from '@playwright/test';

test.describe('Tournament Hub public smoke tests', () => {
  test('@smoke home page loads with sport choices', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /tournament manager/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/choose your sport/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /netball/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /hockey/i })).toBeVisible();
    await expect(page.getByText(/coming soon/i)).toBeVisible();

    await expect(page.locator('body')).not.toContainText(/application error|unexpected error/i);
  });

  test('@smoke netball selection routes to tournaments page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /netball/i }).click();

    await expect(page).toHaveURL(/\/netball\/tournaments$/, { timeout: 15000 });
    await expect(page.getByRole('heading', { name: /netball tournaments/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: /admin/i })).toBeVisible();
  });

  test('@smoke hockey remains disabled', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const hockeyButton = page.getByRole('button', { name: /hockey/i });
    await expect(hockeyButton).toBeDisabled();
    await expect(page.getByText(/coming soon/i)).toBeVisible();
  });

  test('@smoke tournaments page loads directly', async ({ page }) => {
    await page.goto('/netball/tournaments');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /netball tournaments/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: /admin/i })).toBeVisible({ timeout: 15000 });

    // keep this loose because production data may or may not exist
    await expect(page.locator('body')).not.toContainText(/application error|unexpected error/i);
  });

  test('@smoke admin login dialog opens from tournaments page', async ({ page }) => {
    await page.goto('/netball/tournaments');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('button', { name: /admin/i })).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: /admin/i }).click();

    await expect(page.getByRole('heading', { name: /admin login/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByPlaceholder(/email address/i)).toBeVisible();
    await expect(page.getByPlaceholder(/password/i)).toBeVisible();
  });

  test('@smoke scoreboard page loads', async ({ page }) => {
    await page.goto('/scoreboard');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/live scoreboard/i)).toBeVisible({ timeout: 15000 });
    await expect(page.locator('body')).not.toContainText(/application error|unexpected error/i);
  });

  test('@smoke unknown route shows not found page', async ({ page }) => {
    await page.goto('/this-route-should-not-exist');

    await expect(page.locator('body')).toContainText(/404|not found|oops/i);
  });
});
