import { test, expect } from '@playwright/test';
import { authenticateViaUI, TEST_USERS, authenticateUser, logoutUser, openAuthModal, hasActiveSession } from './fixtures/auth';

test.describe('Authentication Flow', () => {
  test.describe.configure({ mode: 'serial' });

  test('should open sign in modal when clicking user icon', async ({ page }) => {
    // Navigate to home page
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    
    // Open auth modal via helper
    await openAuthModal(page);
    
    // Verify modal content
    await expect(page.locator('text=/Sign In/i').first()).toBeVisible();
    await expect(page.locator('input[type="email"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });

  test('should show authentication form elements in modal', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    
    // Open the sign in modal
    await openAuthModal(page);
    
    // Verify form elements
    const emailInput = page.locator('input[type="email"], input#email').first();
    await expect(emailInput).toBeVisible();
    
    const passwordInput = page.locator('input[type="password"], input#password').first();
    await expect(passwordInput).toBeVisible();
    
    const submitButton = page.locator('button[type="submit"]').first();
    await expect(submitButton).toBeVisible();
  });

  test('should successfully login with valid credentials', async ({ page }) => {
    // Set longer timeout for this test (authentication can take time)
    test.setTimeout(60000);
    
    // Authenticate via UI (handles navigation internally)
    await authenticateViaUI(page, TEST_USERS.admin.email, TEST_USERS.admin.password);

    // Verify authentication succeeded by checking for session
    await expect.poll(async () => hasActiveSession(page)).toBe(true);
    
    // Clean up
    await logoutUser(page);
  });

  test('should fail login with invalid credentials', async ({ page }) => {
    // Navigate to home page
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    
    // Open sign in modal
    await openAuthModal(page);
    
    // Fill in invalid credentials
    const emailInput = page.locator('input[type="email"], input#email').first();
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await emailInput.fill('invalid@example.com');
    
    const passwordInput = page.locator('input[type="password"], input#password').first();
    await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
    await passwordInput.fill('wrongpassword');
    
    // Submit form
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.waitFor({ state: 'visible', timeout: 10000 });
    await submitButton.click();

    // Give the UI time to respond
    await page.waitForTimeout(2000);

    // Ensure no session has been created
    const sessionExists = await hasActiveSession(page);
    expect(sessionExists).toBeFalsy();

    // Modal should still be open (login failed)
    const modal = page.locator('[role="dialog"]').first();
    await expect(modal).toBeVisible();
  });

  test('should authenticate via API and maintain session', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'API authentication is verified once in Chromium');
    test.setTimeout(60000);

    // Authenticate via Supabase API (this navigates to base URL)
    await authenticateUser(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    
    // Wait for page to load and session to settle
    await page.waitForTimeout(2000);
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    const hasSession = await page.evaluate(() => {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes('auth-token')) {
          try {
            const value = localStorage.getItem(key);
            if (value) {
              const session = JSON.parse(value);
              if (session && session.access_token) {
                return true;
              }
            }
          } catch {
            // Invalid JSON, continue
          }
        }
      }
      return false;
    }).catch(() => false);

    expect(hasSession).toBe(true);
    
    // Clean up
    await logoutUser(page);
  });
});

