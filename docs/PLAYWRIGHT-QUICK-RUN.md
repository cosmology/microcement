# Playwright Quick Run Guide

## Simple Workflow (After Initial Setup)

Once you've rebuilt the container with Playwright fixes, you can simply run:

```bash
# 1. Set up development environment (updates IP and restarts containers)
./scripts/setup-dev-env.sh

# 2. Run tests
docker exec microcement-app-dev-1 pnpm run test:e2e
```

That's it! ✅

### Tip: Disable Fast Refresh for Stable Test Runs

Next.js Fast Refresh and polling file watchers can fight with Playwright’s parallel mode.  
Before starting the dev stack for end-to-end tests, temporarily disable them:

```bash
FAST_REFRESH=false \
HMR=false \
WATCHPACK_POLLING=false \
CHOKIDAR_USEPOLLING=false \
./scripts/setup-dev-env.sh
```

You only need to do this when you plan to run the Playwright suite.  
Normal development can continue with the defaults (`true`).

## First Time Setup (After Dockerfile Changes)

If you've just updated the Dockerfile or it's the first time, rebuild first:

```bash
# 1. Rebuild container with Playwright fixes
docker compose --profile dev build --no-cache

# 2. Set up development environment (updates IP and starts containers)
./scripts/setup-dev-env.sh

# 3. Run tests
docker exec microcement-app-dev-1 pnpm run test:e2e
```

## What `setup-dev-env.sh` Does

The `scripts/setup-dev-env.sh` script:
1. Detects your current IP address
2. Updates `.env` file with the new IP (NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_URL_EXTERNAL)
3. Backs up the existing `.env` file
4. Stops containers (`dev-stop.sh`)
5. Starts containers (`dev-start.sh`)

Since it restarts containers, it will use the latest built image (if you rebuilt).

## When to Rebuild

You need to rebuild (`docker compose --profile dev build`) when:
- ✅ Dockerfile has changed (like adding Playwright dependencies)
- ✅ Package.json dependencies changed significantly
- ✅ First time setup

You DON'T need to rebuild when:
- ✅ Only code changes (JavaScript/TypeScript files)
- ✅ Only configuration changes (playwright.config.ts, etc.)
- ✅ Just restarting containers

## Quick Test Commands

```bash
# Run all tests
docker exec microcement-app-dev-1 pnpm run test:e2e

# Run only Chromium (fastest)
docker exec microcement-app-dev-1 pnpm run test:e2e --project=chromium

# Run specific test file
docker exec microcement-app-dev-1 pnpm run test:e2e e2e/api-health.spec.ts

# Override worker count (defaults to your CPU core count locally, 2 on CI)
docker exec microcement-app-dev-1 pnpm run test:e2e --workers=4
```

## Troubleshooting

### "Browsers not found" error
**Solution**: Rebuild container (browsers are installed during build)
```bash
docker compose --profile dev build --no-cache
```

### "libudev.so.1 not found" error
**Solution**: The entrypoint script should fix this automatically. If not:
```bash
docker exec microcement-app-dev-1 /usr/local/bin/fix-playwright sh -c "echo 'Symlink fixed'"
docker exec microcement-app-dev-1 pnpm run test:e2e
```

### "Unsupported relocation type 1032" errors
**Solution**: This means Playwright is using headless shell. The config should use regular Chromium. Verify:
```bash
docker exec microcement-app-dev-1 cat playwright.config.ts | grep -A 5 "executablePath"
```

