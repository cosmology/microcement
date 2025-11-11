# Playwright + MCP Integration Guide

## Overview

This guide explains how to use Model Context Protocol (MCP) to generate useful Playwright tests for your application.

## Prerequisites

1. **Playwright Installed**: Already configured in `package.json`
2. **Docker Running**: Your app runs in Docker containers
3. **MCP Server**: Set up MCP server (if using Cursor MCP integration)

## Running Playwright Tests

### Inside Docker Container

Since you run everything in Docker, tests must be executed inside the container:

```bash
# 1. Ensure Docker container is running
docker compose --profile dev up -d

# 2. Find your container name
docker ps | grep app-dev

# 3. Install Playwright browsers (first time only)
docker exec microcement-app-dev-1 pnpm exec playwright install chromium

# 4. Run all E2E tests
docker exec microcement-app-dev-1 pnpm run test:e2e

# 5. Run with UI mode (interactive)
docker exec microcement-app-dev-1 pnpm run test:e2e:ui

# 6. Run in debug mode
docker exec microcement-app-dev-1 pnpm run test:e2e:debug

# 7. Run specific test file
docker exec microcement-app-dev-1 npx playwright test e2e/homepage.spec.ts
```

**Note**: Replace `microcement-app-dev-1` with your actual container name.

### Important Notes

- **Port Conflict**: The Playwright config does NOT auto-start the dev server (it's disabled)
- **Server Must Be Running**: Make sure `docker compose --profile dev up -d` is running before tests
- **Base URL**: Tests use `http://localhost:3000` by default (accessible from container)

## Current Test Files

### 1. `e2e/example.spec.ts` (Basic Example)
- Homepage loading
- Navigation accessibility
- Login page navigation

### 2. `e2e/homepage.spec.ts` (NEW)
- Homepage loading
- Navigation visibility
- Hero section presence

### 3. `e2e/navigation.spec.ts` (NEW)
- Login navigation
- Keyboard accessibility

### 4. `e2e/authentication.spec.ts` (NEW)
- Login page display
- Form elements visibility

### 5. `e2e/scanned-rooms.spec.ts` (NEW)
- Scanned rooms panel (requires auth)

### 6. `e2e/api-health.spec.ts` (NEW)
- API endpoint health checks
- Test endpoint response
- Scanned rooms API

## Using MCP to Generate Tests

### Method 1: Using Cursor MCP Integration

If you have MCP configured in Cursor, you can ask the AI to:

1. **Generate test for specific feature**:
   ```
   "Using MCP, generate a Playwright test for the iOS export upload flow"
   ```

2. **Analyze code and create tests**:
   ```
   "Using MCP, analyze app/components/HomeClient.tsx and create comprehensive E2E tests"
   ```

3. **Create test for user flow**:
   ```
   "Using MCP, create a Playwright test that covers the complete user journey: 
   login → upload model → view in 3D editor → export"
   ```

### Method 2: Manual MCP Prompt Template

Use this template with MCP to generate tests:

```
I need a Playwright E2E test for [FEATURE_NAME]. 

Application Context:
- Next.js app with React
- Runs in Docker container
- Base URL: http://localhost:3000
- Uses Supabase for auth
- Has 3D scene editor (SceneEditor component)
- Has navigation panels (DockedNavigation)
- Supports iOS room scanning export

Test Requirements:
- Test the [SPECIFIC_USER_FLOW]
- Verify [SPECIFIC_ASSERTIONS]
- Handle authentication if needed
- Check for error states
- Verify UI elements are visible

Codebase Structure:
- Main page: app/[locale]/page.tsx → HomeClient component
- Scene editor: app/components/SceneEditor.tsx
- Navigation: app/components/DockedNavigation.tsx
- API routes: app/api/*

Please generate a complete Playwright test file following the existing test patterns.
```

### Method 3: Direct AI Assistance

Ask the AI assistant (me) to generate tests:

1. **Describe the feature to test**:
   ```
   "Generate a Playwright test for the scanned rooms panel that:
   - Opens the panel
   - Lists available rooms
   - Clicks on a room to load it
   - Verifies the 3D scene loads"
   ```

2. **Provide code context**:
   ```
   "Look at app/components/ScannedRoomsList.tsx and create a test that
   verifies the room list loads and items are clickable"
   ```

## Test Generation Workflow

### Step 1: Identify Feature to Test
- What user flow needs testing?
- What are the critical paths?
- What edge cases exist?

### Step 2: Use MCP/AI to Generate Test
- Provide context about the feature
- Specify what to verify
- Include authentication requirements

### Step 3: Review and Refine
- Check if test follows patterns
- Verify selectors are stable
- Add proper waits and timeouts

### Step 4: Run and Debug
- Run test in Docker container
- Fix any issues
- Ensure test is reliable

## Example: Generating Test for iOS Export Flow

**Prompt to MCP/AI**:
```
Generate a Playwright E2E test for the iOS room scanning export flow:

1. User uploads USDZ from iOS app
2. Backend processes and converts to GLB
3. User is redirected to web app with URL params (?exportId=xxx&userId=xxx)
4. HomeClient reads params and loads export data
5. SceneEditor automatically loads the converted GLB model

Test should:
- Simulate the redirect with URL params
- Verify HomeClient processes the params
- Check that model loads in SceneEditor
- Verify the GLB file is accessible
```

**Expected Output**: A test file like `e2e/ios-export-flow.spec.ts`

## Best Practices

### 1. Stable Selectors
```typescript
// ❌ Bad: Fragile selector
await page.click('div > div > button');

// ✅ Good: Stable selector
await page.click('button[aria-label="Export to Web"]');
await page.click('text=Export to Web');
```

### 2. Proper Waits
```typescript
// ❌ Bad: Fixed timeout
await page.waitForTimeout(5000);

// ✅ Good: Wait for specific condition
await page.waitForLoadState('networkidle');
await expect(element).toBeVisible();
```

### 3. Error Handling
```typescript
test('should handle missing export', async ({ page }) => {
  await page.goto('/?exportId=invalid-id');
  
  // Should show error or redirect
  await expect(page.locator('text=/error|not found/i')).toBeVisible();
});
```

### 4. Authentication State
```typescript
// Use conditional logic for auth-required tests
if (await loginButton.isVisible({ timeout: 5000 }).catch(() => false)) {
  // Test authenticated flow
} else {
  test.skip(); // Skip if not authenticated
}
```

## Useful Test Scenarios to Generate

1. **iOS Export Flow**: Complete room scan → upload → conversion → view
2. **Model Loading**: Load model from panels → verify 3D scene
3. **Navigation**: Open panels → verify content loads
4. **Authentication**: Login → verify user state → logout
5. **Error Handling**: Invalid URLs → 404 pages → API errors
6. **3D Scene Interaction**: Camera controls → model rotation → measurements toggle
7. **Responsive Design**: Mobile viewport → panel behavior

## Debugging Tests

### Run with Debug Mode
```bash
docker compose exec app-dev pnpm run test:e2e:debug
```

### Run with UI Mode (Recommended)
```bash
docker compose exec app-dev pnpm run test:e2e:ui
```

### View Test Report
```bash
# After running tests, view HTML report
docker compose exec app-dev npx playwright show-report
```

### Screenshots on Failure
Screenshots are automatically saved to `test-results/` directory on test failures.

## Troubleshooting

### Issue: Tests timeout
**Solution**: Increase timeout in test or wait for specific conditions
```typescript
test.setTimeout(60000); // 60 seconds
```

### Issue: Port conflict
**Solution**: Make sure dev server is running in Docker, not locally
```bash
docker compose stop app-dev  # Stop if running locally
docker compose --profile dev up -d  # Start in Docker
```

### Issue: Selectors not found
**Solution**: Use Playwright's codegen to find selectors
```bash
docker compose exec app-dev npx playwright codegen http://localhost:3000
```

## Next Steps

1. **Run existing tests** to verify setup works
2. **Generate new tests** using MCP/AI for critical features
3. **Add to CI/CD** pipeline for automated testing
4. **Create test data** fixtures for consistent test runs

