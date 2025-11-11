import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should load the homepage successfully', async ({ page }) => {
    // App uses i18n routing - root redirects to /en
    await page.goto('/');
    
    // Wait for redirect to /en and page to load
    await page.waitForURL(/\/(en|es|sr)/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    
    // Check page title (may be empty or contain microcement)
    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test('should have navigation visible', async ({ page }) => {
    // Use explicit locale path
    await page.goto('/en');
    await page.waitForLoadState('networkidle');
    
    // Check for navigation element - could be nav, header, or navigation component
    const nav = page.locator('nav, header, [role="navigation"], [class*="navigation" i]').first();
    await expect(nav).toBeVisible({ timeout: 15000 });
  });

  test('should have main content area', async ({ page }) => {
    await page.goto('/en');
    await page.waitForLoadState('networkidle');
    
    // Look for main content - could be main, section, or HomeClient content
    const mainContent = page.locator('main, section, [role="main"], [class*="home" i]').first();
    await expect(mainContent).toBeVisible({ timeout: 15000 });
  });
});

