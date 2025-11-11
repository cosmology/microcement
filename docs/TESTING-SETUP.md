# Testing Setup Guide

This document describes the comprehensive testing setup for the microcement project, including unit tests, integration tests, and end-to-end (E2E) tests with code coverage.

## Overview

The project uses industry-standard test runners:

- **Vitest**: Unit and integration tests for TypeScript/React code
- **Playwright**: End-to-end tests for browser automation

## Frontend & API Testing (TypeScript/Next.js)

### Vitest Configuration

**Configuration File**: `vitest.config.ts`

**Features**:
- React component testing with `jsdom` environment
- Code coverage with V8 provider
- Path aliases support (`@/` imports)
- Coverage thresholds: 60% for lines, functions, branches, statements

**Setup File**: `vitest.setup.ts`
- Extends Vitest with jest-dom matchers
- Mocks Next.js router and Image components
- Automatic cleanup after tests

### Running Vitest Tests

**All commands must be run inside the Docker container using `pnpm`:**

```bash
# Ensure Docker container is running
docker compose --profile dev up -d

# Run tests in watch mode (recommended for development)
docker compose exec app-dev pnpm run test

# Run tests with UI (interactive mode)
docker compose exec app-dev pnpm run test:ui

# Run tests once with coverage report
docker compose exec app-dev pnpm run test:coverage

# Run all tests (unit + E2E)
docker compose exec app-dev pnpm run test:all
```

**Note**: The container name may vary (e.g., `microcement-app-dev-1`). Check with:
```bash
docker ps | grep app-dev
```

**Coverage Reports**:
- Text output in terminal
- HTML report: `coverage/index.html`
- JSON report: `coverage/coverage-final.json`
- LCOV report: `coverage/lcov.info` (for CI/CD integration)

### Test File Locations

- Unit tests: `**/*.test.{ts,tsx}` or `**/*.spec.{ts,tsx}`
- Example: `lib/__tests__/convertUsdzToGlb.test.ts`
- Integration tests: Same naming convention in `app/api/` directories

### Writing Vitest Tests

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('MyComponent', () => {
  it('should render correctly', () => {
    // Test implementation
  });
});
```

## End-to-End Testing (Playwright)

### Playwright Configuration

**Configuration File**: `playwright.config.ts`

**Features**:
- Multiple browser support (Chromium, Firefox, WebKit)
- Mobile viewport testing (iPhone 12, Pixel 5)
- Automatic dev server startup
- Screenshots and videos on failure
- Trace viewer for debugging

### Running Playwright Tests

**All commands must be run inside the Docker container:**

```bash
# Ensure Docker container is running
docker compose --profile dev up -d

# Install Playwright browsers (first time only)
docker compose exec app-dev npx playwright install --with-deps

# Run all E2E tests
docker compose exec app-dev pnpm run test:e2e

# Run tests with UI mode (interactive)
docker compose exec app-dev pnpm run test:e2e:ui

# Debug tests step-by-step
docker compose exec app-dev pnpm run test:e2e:debug

# Run tests in specific browser
docker compose exec app-dev npx playwright test --project=chromium
```

**Important**: 
- Playwright requires the Next.js dev server to be running. The `playwright.config.ts` automatically starts the dev server, but ensure port 3000 is accessible.
- **Port Conflict**: If the dev server is already running on port 3000, you'll get `EADDRINUSE` error. Solutions:
  1. Stop the dev server temporarily: `docker compose stop app-dev` (then restart after tests)
  2. Update `playwright.config.ts` to disable `webServer` and use existing server:
     ```typescript
     webServer: undefined, // Disable auto-start, use existing server
     ```
  3. Run tests in a separate container without the dev server running

**Test Reports**:
- HTML report: `playwright-report/index.html`
- JSON report: `playwright-report/results.json`

### Test File Locations

- E2E tests: `e2e/**/*.spec.ts`
- Example: `e2e/example.spec.ts`

### Writing Playwright Tests

```typescript
import { test, expect } from '@playwright/test';

test('should load homepage', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/microcement/i);
});
```

## Code Coverage

### Coverage Goals

- **Minimum thresholds**: 60% for all metrics
- **Current targets**:
  - Lines: 60%
  - Functions: 60%
  - Branches: 60%
  - Statements: 60%

### Coverage Reports

**Vitest (Frontend/API)**:
```bash
# Run with coverage (inside Docker)
docker compose exec app-dev pnpm run test:coverage

# Coverage reports location inside container: /app/coverage/index.html
# Copy to host for viewing:
docker compose cp app-dev:/app/coverage ./coverage-local
# Then open: ./coverage-local/index.html
```

## CI/CD Integration

### Running All Tests

```bash
# Run frontend tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

### Recommended CI Workflow

1. **Lint**: `npm run lint`
2. **Type Check**: `npm run typecheck`
3. **Unit Tests**: `npm run test:coverage`
4. **E2E Tests**: `npm run test:e2e`

## Docker Integration

This project runs all commands inside Docker containers using `pnpm`. All test commands must be executed using `docker compose exec app-dev`.

### Quick Reference

```bash
# Start the development container
docker compose --profile dev up -d

# Run unit tests with coverage
docker compose exec app-dev pnpm run test:coverage

# Run E2E tests
docker compose exec app-dev pnpm run test:e2e

# Run all tests
docker compose exec app-dev pnpm run test:all

# Check container name if needed
docker ps | grep app-dev
```

### Accessing Coverage Reports

Coverage reports are generated inside the container. To access them:

```bash
# Copy coverage reports from container to host
docker compose cp app-dev:/app/coverage ./coverage-local
docker compose cp app-dev:/app/playwright-report ./playwright-report-local

# Then open in browser:
# - Frontend coverage: ./coverage-local/index.html
# - E2E report: ./playwright-report-local/index.html
```

**Location in Container**:
- **Vitest Coverage**: `/app/coverage/index.html`
- **Playwright Report**: `/app/playwright-report/index.html`

## Best Practices

1. **Write tests first** (TDD) when possible
2. **Keep tests isolated**: Each test should be independent
3. **Use descriptive test names**: `should [expected behavior] when [condition]`
4. **Mock external dependencies**: Don't rely on external services in unit tests
5. **Test edge cases**: Include error handling and boundary conditions
6. **Maintain coverage**: Aim to increase coverage over time
7. **Tag slow tests**: Use markers to skip slow tests during development

## Troubleshooting

### Vitest Issues

**Problem**: Module resolution errors
**Solution**: Check `vitest.config.ts` path aliases match `tsconfig.json`

**Problem**: React component not rendering
**Solution**: Ensure `@vitejs/plugin-react` is installed and configured

### Playwright Issues

**Problem**: Browser not found
**Solution**: Run `npx playwright install`

**Problem**: Tests timeout
**Solution**: Increase timeout in `playwright.config.ts` or check webServer configuration

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library Documentation](https://testing-library.com/)
