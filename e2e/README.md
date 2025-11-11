# E2E Tests

This directory contains end-to-end tests using Playwright.

## Quick Start

```bash
# Run all tests
docker exec microcement-app-dev-1 pnpm run test:e2e

# Run specific test file
docker exec microcement-app-dev-1 pnpm run test:e2e e2e/authentication.spec.ts

# Run tests in UI mode (interactive)
docker exec microcement-app-dev-1 pnpm run test:e2e:ui
```

## Test Structure

- `authentication.spec.ts` - Authentication flow tests (login, logout, session management)
- `scanned-rooms.spec.ts` - Scanned rooms panel tests (requires authentication)
- `navigation.spec.ts` - Navigation tests (both authenticated and unauthenticated)
- `homepage.spec.ts` - Homepage tests
- `api-health.spec.ts` - API health check tests
- `example.spec.ts` - Example test template
- `fixtures/auth.ts` - Authentication helpers and fixtures

## Authentication Tests

### What Are Skipped Tests?

Skipped tests are tests that don't run because certain conditions aren't met. We had **conditional skips** that occurred when:
- User wasn't authenticated (tests would skip silently)
- Required UI elements weren't found

### Real Authentication Tests

We've implemented **real authentication tests** that:
- Actually authenticate users before running tests
- Never skip silently - they either pass or fail
- Test different user roles (admin, architect, end user)
- Clean up after themselves

### Using Authentication Fixtures

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

- `authenticatedPage` - Authenticated as admin (default)
- `authenticatedAsAdmin` - Authenticated as admin user
- `authenticatedAsArchitect` - Authenticated as architect user
- `authenticatedAsEndUser` - Authenticated as end user

### Manual Authentication

```typescript
import { authenticateUser, TEST_USERS } from './fixtures/auth';

test('my test', async ({ page }) => {
  // Authenticate via API
  await authenticateUser(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
  
  // Navigate and test...
});
```

## Test Users

Test users are defined in `fixtures/auth.ts`:

- **Admin**: `ivanprokic@gmail.com` / `test12345`
- **Architect**: `ivanprokic@yahoo.com` / `ivan12345`
- **End User**: `emilijaprokic2015@gmail.com` / `ema12345`

## Writing Tests

### Basic Test

```typescript
import { test, expect } from '@playwright/test';

test('should display homepage', async ({ page }) => {
  await page.goto('/en');
  await expect(page.locator('h1')).toBeVisible();
});
```

### Authenticated Test

```typescript
import { test, expect } from './fixtures/auth';

test('should access protected feature', async ({ authenticatedAsAdmin: page }) => {
  await page.goto('/en/protected');
  await expect(page.locator('[data-testid="protected-content"]')).toBeVisible();
});
```

### Testing Both States

```typescript
import { test, expect } from '@playwright/test';
import { test as authTest } from './fixtures/auth';

// Unauthenticated
test('should redirect to login', async ({ page }) => {
  await page.goto('/en/protected');
  await expect(page).toHaveURL(/.*login/);
});

// Authenticated
authTest('should access protected page', async ({ authenticatedPage: page }) => {
  await page.goto('/en/protected');
  await expect(page).toHaveURL(/.*protected/);
});
```

## Best Practices

1. **Use fixtures for authentication** - Don't manually authenticate in every test
2. **Test both authenticated and unauthenticated states**
3. **Use appropriate user roles** - Test with the correct role for the feature
4. **Clean up after tests** - Fixtures automatically clean up, but clean up manually if needed
5. **Use explicit waits** - `await expect(element).toBeVisible()` instead of `await page.waitForTimeout()`

## Troubleshooting

### Authentication Fails

- Check test user credentials in `fixtures/auth.ts`
- Verify Supabase is running: `docker compose ps`
- Check environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Tests Flaking

- Add proper waits: `await page.waitForLoadState('networkidle')`
- Use explicit waits: `await expect(element).toBeVisible()`
- Increase timeouts for slow operations

## Documentation

For more details, see:
- `docs/PLAYWRIGHT-AUTHENTICATION-TESTS.md` - Complete authentication testing guide
- `docs/PLAYWRIGHT-QUICK-START.md` - Quick start guide
- `docs/PLAYWRIGHT-MCP-INTEGRATION.md` - MCP integration guide
