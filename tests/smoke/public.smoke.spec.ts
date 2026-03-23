import { test, expect } from '@playwright/test';

test.describe('Tournament Hub public smoke tests', () => {
  test('@smoke home page loads', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/application error|unexpected error|404|500/i);
  });

  test('@smoke tournaments page loads', async ({ page }) => {
    await page.goto('/tournaments');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/application error|unexpected error|404|500/i);
  });

  test('@smoke admin login page loads', async ({ page }) => {
    await page.goto('/admin/login');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/application error|unexpected error|404|500/i);
  });
});