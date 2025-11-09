# Playwright Authentication Tests Guide

## Overview

This guide explains how authentication tests work in our Playwright test suite, including:
- What are skipped tests and why they exist
- How to implement real authentication tests
- Using authentication fixtures and helpers

## What Are Skipped Tests?

Skipped tests are tests that don't run because certain conditions aren't met. In our codebase, we have **conditional skips** that occur when:

1. **Authentication Required**: Tests that require a logged-in user skip if the user isn't authenticated
2. **Element Not Found**: Tests skip if required UI elements aren't found (often because authentication is missing)
3. **Feature Not Available**: Tests skip if a feature isn't available in the current context

### Example of Conditional Skip

```typescript
// OLD WAY (conditional skip)
test('should load scanned rooms panel when authenticated', async ({ page }) => {
  await page.goto('/en');
  
  const button = page.locator('button:has-text("Scanned Rooms")');
  if (!(await button.isVisible({ timeout: 5000 }).catch(() => false))) {
    test.skip(); // Skip if button not found (likely not authenticated)
  }
  
  await button.click();
  // ... rest of test
});
```

**Problem**: This test silently skips when not authenticated, making it hard to know if the test is actually working.

## Real Authentication Tests

We've implemented **real authentication tests** that:
1. Actually authenticate users before running tests
2. Never skip silently - they either pass or fail
3. Test different user roles (admin, architect, end user)
4. Clean up after themselves

### Authentication Fixtures

We've created authentication fixtures in `e2e/fixtures/auth.ts`:

```typescript
import { test, expect } from './fixtures/auth';

// Use authenticated fixture
test('should load scanned rooms panel', async ({ authenticatedAsAdmin: page }) => {
  // Page is already authenticated as admin
  await page.goto('/en');
  // Test authenticated features...
});
```

### Available Fixtures

1. **`authenticatedAsAdmin`**: Authenticated as admin user
2. **`authenticatedAsArchitect`**: Authenticated as architect user
3. **`authenticatedAsEndUser`**: Authenticated as end user

### Test Users

Test users are defined in `e2e/fixtures/auth.ts`:

```typescript
export const TEST_USERS = {
  admin: {
    email: 'ivanprokic@gmail.com',
    password: 'test12345',
  },
  architect: {
    email: 'ivanprokic@yahoo.com',
    password: 'ivan12345',
  },
  endUser: {
    email: 'emilijaprokic2015@gmail.com',
    password: 'ema12345',
  },
};
```

## How Authentication Works

### Method 1: API Authentication (Recommended)

Authenticate directly via Supabase API and set the session in the browser:

```typescript
import { authenticateUser } from './fixtures/auth';

test('my test', async ({ page }) => {
  // Authenticate via API
  await authenticateUser(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
  
  // Navigate to app
  await page.goto('/en');
  
  // Test authenticated features...
});
```

**Advantages**:
- Faster (no UI interaction)
- More reliable
- Works even if UI changes

### Method 2: UI Authentication

Fill out the login form and submit it:

```typescript
import { authenticateViaUI } from './fixtures/auth';

test('my test', async ({ page }) => {
  // Authenticate via UI
  await authenticateViaUI(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
  
  // Test authenticated features...
});
```

**Advantages**:
- Tests the actual login flow
- Catches UI-related authentication issues

## Migration Guide: Converting Skipped Tests

### Before (Conditional Skip)

```typescript
import { test, expect } from '@playwright/test';

test('should load scanned rooms panel', async ({ page }) => {
  await page.goto('/en');
  
  const button = page.locator('button:has-text("Scanned")');
  if (!(await button.isVisible({ timeout: 5000 }).catch(() => false))) {
    test.skip(); // ❌ Silent skip
  }
  
  await button.click();
  await expect(panel).toBeVisible();
});
```

### After (Real Authentication)

```typescript
import { test, expect } from './fixtures/auth';

test('should load scanned rooms panel', async ({ authenticatedAsAdmin: page }) => {
  // ✅ Already authenticated, no skip needed
  const button = page.locator('button:has-text("Scanned")');
  await expect(button).toBeVisible();
  await button.click();
  await expect(panel).toBeVisible();
});
```

## Writing New Authentication Tests

### 1. Test Login Flow

```typescript
import { test, expect } from '@playwright/test';
import { authenticateViaUI, TEST_USERS } from './fixtures/auth';

test('should successfully login', async ({ page }) => {
  await page.goto('/en/login');
  await authenticateViaUI(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
  
  // Verify redirect away from login
  expect(page.url()).not.toContain('/login');
});
```

### 2. Test Authenticated Features

```typescript
import { test, expect } from './fixtures/auth';

test('should access user profile when authenticated', async ({ authenticatedAsAdmin: page }) => {
  // Navigate to profile or check for profile elements
  const profileButton = page.locator('button:has-text("Profile")');
  await expect(profileButton).toBeVisible();
  await profileButton.click();
  
  // Verify profile is shown
  await expect(page.locator('text=/profile|settings/i')).toBeVisible();
});
```

### 3. Test Role-Based Access

```typescript
import { test, expect } from './fixtures/auth';

test('admin should see admin panel', async ({ authenticatedAsAdmin: page }) => {
  const adminPanel = page.locator('[data-testid="admin-panel"]');
  await expect(adminPanel).toBeVisible();
});

test('end user should not see admin panel', async ({ authenticatedAsEndUser: page }) => {
  const adminPanel = page.locator('[data-testid="admin-panel"]');
  await expect(adminPanel).not.toBeVisible();
});
```

### 4. Test Logout

```typescript
import { test, expect } from './fixtures/auth';
import { logoutUser } from './fixtures/auth';

test('should logout successfully', async ({ authenticatedAsAdmin: page }) => {
  // Find and click logout button
  const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out")');
  await logoutButton.click();
  
  // Verify redirected to login or home
  await page.waitForTimeout(2000);
  const url = page.url();
  expect(url.includes('/login') || url === page.context().baseURL + '/en').toBe(true);
});
```

## Best Practices

### 1. Use Fixtures for Authentication

✅ **Good**: Use fixtures for authenticated tests
```typescript
test('my test', async ({ authenticatedAsAdmin: page }) => {
  // Already authenticated
});
```

❌ **Bad**: Manually authenticate in every test
```typescript
test('my test', async ({ page }) => {
  await authenticateUser(page, ...); // Repetitive
});
```

### 2. Test Both Authenticated and Unauthenticated States

```typescript
// Test unauthenticated state
test('should redirect to login when not authenticated', async ({ page }) => {
  await page.goto('/en/protected-page');
  await expect(page).toHaveURL(/.*login/);
});

// Test authenticated state
test('should access protected page when authenticated', async ({ authenticatedPage: page }) => {
  await page.goto('/en/protected-page');
  await expect(page).toHaveURL(/.*protected-page/);
});
```

### 3. Clean Up After Tests

Fixtures automatically clean up (logout) after each test, but if you manually authenticate, clean up:

```typescript
test('my test', async ({ page }) => {
  await authenticateUser(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
  
  try {
    // Your test code...
  } finally {
    await logoutUser(page); // Always clean up
  }
});
```

### 4. Use Appropriate User Roles

Test with the correct user role for the feature:

```typescript
// Admin-only feature
test('admin can delete users', async ({ authenticatedAsAdmin: page }) => {
  // ...
});

// Architect feature
test('architect can create projects', async ({ authenticatedAsArchitect: page }) => {
  // ...
});
```

## Troubleshooting

### Authentication Fails

**Problem**: `Authentication failed: Invalid login credentials`

**Solutions**:
1. Check test user credentials in `e2e/fixtures/auth.ts`
2. Verify Supabase is running: `docker compose ps`
3. Check environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Verify test users exist in Supabase database

### Session Not Persisting

**Problem**: User appears logged out after navigation

**Solutions**:
1. Ensure `authenticateUser` is called before navigation
2. Check that Supabase session storage key matches your setup
3. Verify `persistSession: true` in Supabase client config

### Tests Flaking

**Problem**: Tests sometimes pass, sometimes fail

**Solutions**:
1. Add proper waits: `await page.waitForLoadState('networkidle')`
2. Use explicit waits: `await expect(element).toBeVisible()`
3. Increase timeouts for slow operations
4. Check for race conditions in authentication flow

## Running Authentication Tests

```bash
# Run all tests (including authentication tests)
docker exec microcement-app-dev-1 pnpm run test:e2e

# Run only authentication tests
docker exec microcement-app-dev-1 pnpm run test:e2e --grep "Authentication"

# Run authenticated feature tests
docker exec microcement-app-dev-1 pnpm run test:e2e --grep "authenticated"
```

## Summary

- **Skipped tests** are tests that don't run due to missing conditions (usually authentication)
- **Real authentication tests** actually authenticate users and test features properly
- Use **authentication fixtures** (`authenticatedAsAdmin`, etc.) for authenticated tests
- Use **`authenticateUser`** or **`authenticateViaUI`** helpers for manual authentication
- Always test both authenticated and unauthenticated states
- Clean up after tests (fixtures do this automatically)

For more information, see:
- `e2e/fixtures/auth.ts` - Authentication helpers and fixtures
- `e2e/authentication.spec.ts` - Authentication flow tests
- `e2e/scanned-rooms.spec.ts` - Example of authenticated feature tests

