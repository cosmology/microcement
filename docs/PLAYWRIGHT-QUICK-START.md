# Playwright Quick Start Guide

## 🚀 Quick Start

### 1. Install Playwright Browsers (First Time Only)

```bash
# Make sure Docker container is running
docker compose --profile dev up -d

# Install browsers inside container (use actual container name)
# Find container name: docker ps | grep app-dev
docker exec microcement-app-dev-1 pnpm exec playwright install chromium

# Or install all browsers (takes longer)
docker exec microcement-app-dev-1 pnpm exec playwright install chromium firefox webkit
```

**Note**: If your container name is different, find it with:
```bash
docker ps | grep app-dev
```

### 2. Run Tests

```bash
# Run all tests (use actual container name)
docker exec microcement-app-dev-1 pnpm run test:e2e

# Run with UI (interactive - recommended for development)
docker exec microcement-app-dev-1 pnpm run test:e2e:ui

# Run in debug mode
docker exec microcement-app-dev-1 pnpm run test:e2e:debug

# Run specific test file
docker exec microcement-app-dev-1 npx playwright test e2e/homepage.spec.ts

# Generate test code (helps find selectors)
docker exec microcement-app-dev-1 pnpm run test:e2e:codegen
```

**Note**: Replace `microcement-app-dev-1` with your actual container name if different.

## 📝 Using MCP/AI to Generate Tests

### Quick Prompt Template

**For Cursor AI (with MCP)**:
```
Generate a Playwright test for [FEATURE_NAME] that:
1. [Step 1 description]
2. [Step 2 description]
3. Verifies [expected outcome]

Application runs in Docker on http://localhost:3000
```

### Example: Generate Test for iOS Export Flow

**Prompt**:
```
Generate a Playwright E2E test for the iOS room scanning export flow:

1. User gets redirected from iOS app with URL params: ?exportId=xxx&userId=xxx
2. HomeClient component processes the params
3. SceneEditor automatically loads the converted GLB model
4. Verify the 3D scene renders correctly

Application context:
- Next.js app with React
- Base URL: http://localhost:3000
- Main component: app/components/HomeClient.tsx
- Scene component: app/components/SceneEditor.tsx
- Uses Zustand store for state management

Test should handle:
- URL parameter parsing
- API call to fetch export data
- Model loading in 3D scene
- Error states if export not found
```

## 📚 Test Files

- `e2e/homepage.spec.ts` - Homepage loading and navigation
- `e2e/navigation.spec.ts` - Navigation menu and links
- `e2e/authentication.spec.ts` - Login page and auth flow
- `e2e/scanned-rooms.spec.ts` - Scanned rooms panel (requires auth)
- `e2e/api-health.spec.ts` - API endpoint health checks
- `e2e/example.spec.ts` - Basic example tests

## 🎯 Common Test Scenarios

### Test Authentication Flow
```typescript
test('should login successfully', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[type="email"]', 'test@example.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/(en|es|sr)/);
});
```

### Test Model Loading
```typescript
test('should load model in 3D scene', async ({ page }) => {
  await page.goto('/?exportId=test-id');
  await page.waitForLoadState('networkidle');
  
  // Wait for SceneEditor to load
  const canvas = page.locator('canvas').first();
  await expect(canvas).toBeVisible({ timeout: 10000 });
});
```

### Test Panel Navigation
```typescript
test('should open scanned rooms panel', async ({ page }) => {
  await page.goto('/');
  await page.click('button:has-text("Scanned Rooms")');
  
  const panel = page.locator('[role="dialog"]').first();
  await expect(panel).toBeVisible();
});
```

## 🔧 Useful Commands

### Find Selectors
```bash
# Use codegen to interact with app and generate selectors
docker compose exec app-dev pnpm run test:e2e:codegen
```

### View Test Report
```bash
# After running tests
docker compose exec app-dev npx playwright show-report
```

### Run Specific Browser
```bash
docker compose exec app-dev npx playwright test --project=chromium
docker compose exec app-dev npx playwright test --project=firefox
docker compose exec app-dev npx playwright test --project=webkit
```

## ⚠️ Important Notes

### UI Mode Doesn't Work in Docker

**UI mode (`test:e2e:ui`) will NOT work in Docker containers** because it requires X11 display server. Use headless mode instead:

```bash
# ✅ Use this (headless mode)
docker exec microcement-app-dev-1 pnpm run test:e2e

# ❌ This won't work (UI mode)
docker exec microcement-app-dev-1 pnpm run test:e2e:ui
```

All tests work the same in headless mode - you just won't see the visual UI.

## ⚠️ Troubleshooting

### Issue: Port already in use
**Solution**: Make sure dev server is running in Docker, not locally
```bash
docker compose --profile dev up -d
```

### Issue: Tests timeout
**Solution**: Increase timeout or wait for specific conditions
```typescript
test.setTimeout(60000); // 60 seconds
await page.waitForLoadState('networkidle');
```

### Issue: Selectors not found
**Solution**: Use codegen to find correct selectors
```bash
docker exec microcement-app-dev-1 pnpm run test:e2e:codegen
```

### Issue: Browser launch errors
**Solution**: Dependencies are now in Dockerfile. If you see errors, rebuild:
```bash
docker compose --profile dev build --no-cache
docker exec microcement-app-dev-1 pnpm exec playwright install chromium
```

## 📖 More Information

- **Full Guide**: See `docs/PLAYWRIGHT-MCP-INTEGRATION.md`
- **Testing Setup**: See `docs/TESTING-SETUP.md`
- **Playwright Docs**: https://playwright.dev/

