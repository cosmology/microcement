# WebKit on Alpine Linux ARM64

## Issue

WebKit has known compatibility issues on Alpine Linux ARM64. The browser is marked as "frozen" and doesn't receive updates for this platform.

## Solution

WebKit and Mobile Safari projects are **disabled by default** in `playwright.config.ts` for Alpine Linux compatibility.

## Current Configuration

In `playwright.config.ts`, WebKit projects are commented out:

```typescript
// WebKit disabled on Alpine Linux ARM64 due to compatibility issues
// {
//   name: 'webkit',
//   use: { ...devices['Desktop Safari'] },
// },
// {
//   name: 'Mobile Safari',
//   use: { ...devices['iPhone 12'] },
// },
```

## Available Browsers

✅ **Chromium** - Fully supported and working
✅ **Firefox** - Fully supported and working  
✅ **Mobile Chrome** - Fully supported (uses Chromium)

❌ **WebKit** - Disabled (compatibility issues on Alpine ARM64)
❌ **Mobile Safari** - Disabled (uses WebKit)

## Enabling WebKit (Not Recommended)

If you absolutely need WebKit testing, you can:

1. **Use a different base image** (not Alpine):
   - Switch to `node:20` (Debian-based) instead of `node:20-alpine`
   - Update Dockerfile accordingly

2. **Install additional dependencies** (may not work):
   ```bash
   docker exec <container> sh -c "apk add --no-cache libwoff1 libepoxy libgles gstreamer gst-plugins-base-libs"
   ```

3. **Uncomment WebKit projects** in `playwright.config.ts`

## Recommended Approach

For cross-browser testing in Alpine Linux:

- Use **Chromium** for primary testing (covers Chrome, Edge, Opera)
- Use **Firefox** for Firefox-specific testing
- Use **Mobile Chrome** for mobile viewport testing

These three browsers provide excellent coverage without WebKit compatibility issues.

## Alternative: Run Tests Locally

If you need WebKit testing, run tests locally on macOS or Linux (non-Alpine):

```bash
# On macOS or Linux host
pnpm install
pnpm exec playwright install
pnpm run test:e2e  # Will include WebKit
```

