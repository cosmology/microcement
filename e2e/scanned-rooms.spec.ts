import { test, expect, waitForRoleState } from './fixtures/auth';

test.describe('Scanned Rooms Panel (Role Detection)', () => {
  test('exposes admin role and renders scanned rooms nav', async ({ authenticatedAsAdmin: page }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForURL(/\/en(\?.*)?$/, { timeout: 15000 }).catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    const roleState = await waitForRoleState(page, 'admin');
    test.info().attach('roleState', { body: JSON.stringify(roleState, null, 2), contentType: 'application/json' });

    expect(roleState).not.toBeNull();
    expect(roleState.role).toBe('admin');

    const navLink = page.locator('[data-testid="nav-scannedRooms"]').first();
    await navLink.waitFor({ state: 'visible', timeout: 20000 });
  });
});

