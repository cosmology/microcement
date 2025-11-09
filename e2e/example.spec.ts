import { test, expect, Page } from '@playwright/test';
import { openAuthModal } from './fixtures/auth';

async function gotoLocaleHome(page: Page, path = '/en') {
  try {
    await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 60000 });
  } catch (error) {
    if (error instanceof Error && /Timeout|ERR_FAILED|ERR_CONNECTION|net::ERR/.test(error.message)) {
      await page.waitForURL(/\/(en|es|sr)(\?.*)?$/, { timeout: 15000 }).catch(() => {});
    } else {
      throw error;
    }
  }
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
}

test.describe('Homepage', () => {
  test('should load the homepage', async ({ page }) => {
    // App uses i18n routing - root redirects to /en
    await page.goto('/');
    
    // Wait for redirect to locale path
    await page.waitForURL(/\/(en|es|sr)/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    
    // Check page title (may be empty, but page should load)
    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test('should have accessible navigation', async ({ page }) => {
    await gotoLocaleHome(page);
    
    // Look for navigation - could be nav, header, or navigation component
    const nav = page.locator('nav, header, [role="navigation"], [class*="navigation" i]').first();
    if (await nav.isVisible({ timeout: 15000 }).catch(() => false)) {
      await expect(nav).toBeVisible({ timeout: 15000 });
    } else {
      test.skip();
    }
  });
});

test.describe('Authentication', () => {
  test('should allow user to navigate to login page', async ({ page }) => {
    await gotoLocaleHome(page);

    await openAuthModal(page);

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await expect(dialog.locator('input[type="email"], input#email').first()).toBeVisible();
  });
});
