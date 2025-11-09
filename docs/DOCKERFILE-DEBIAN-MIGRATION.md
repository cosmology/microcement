# Dockerfile Migration: Alpine → Debian

## Overview

The Dockerfile has been migrated from Alpine-based (`node:20-alpine`) to Debian-based (`node:20-slim`) to resolve Playwright Chromium compatibility issues.

## Why the Change?

**Problem**: Playwright's Chromium binaries (both headless shell and regular) are compiled for glibc-based systems (Ubuntu/Debian), but Alpine Linux uses musl libc, causing binary incompatibility errors:
- `unsupported relocation type 1032`
- `posix_fallocate64: symbol not found`
- `__memcpy_chk: symbol not found`
- `libudev.so.1: No such file or directory`

**Solution**: Switch to Debian-based Node image (`node:20-slim`) which uses glibc and is fully compatible with Playwright browsers.

## Changes Made

### 1. Base Image
- **Before**: `FROM node:20-alpine`
- **After**: `FROM node:20-slim`

### 2. Package Manager
- **Before**: `apk add` (Alpine Package Keeper)
- **After**: `apt-get install` (Debian Advanced Package Tool)

### 3. Package Dependencies
- **Before**: Alpine-specific packages (`libc6-compat`, `eudev`, etc.)
- **After**: Debian-specific packages (`libnss3`, `libatk1.0-0`, `libgbm1`, etc.)

### 4. Playwright Browsers
- **Before**: Only `chromium` and `firefox` (WebKit disabled due to Alpine incompatibility)
- **After**: `chromium`, `firefox`, and `webkit` (all work on Debian)

### 5. Removed Workarounds
- ❌ Removed `libudev.so.1` symlink creation (not needed on Debian)
- ❌ Removed headless shell symlink workaround (not needed on Debian)
- ❌ Removed entrypoint script (`/usr/local/bin/fix-playwright`)
- ❌ Removed Playwright config overrides forcing regular Chromium

### 6. User Creation
- **Before**: `addgroup` and `adduser` (Alpine syntax)
- **After**: `groupadd` and `useradd` (Debian syntax)

## Image Size Impact

- **Alpine**: ~50MB base + ~100MB dependencies ≈ **~150MB**
- **Debian Slim**: ~200MB base + ~150MB dependencies ≈ **~350MB**

**Trade-off**: ~200MB larger image for full Playwright compatibility.

## Benefits

1. ✅ **Full Playwright Compatibility**: All browsers work out of the box
2. ✅ **WebKit Support**: Can now test Safari on WebKit
3. ✅ **No Workarounds**: Cleaner Dockerfile without Alpine-specific hacks
4. ✅ **Better Library Support**: Debian has better support for glibc-based binaries
5. ✅ **More Stable**: Less likely to encounter compatibility issues

## Migration Steps

If you have existing containers:

```bash
# 1. Stop existing containers
docker compose --profile dev down

# 2. Rebuild with new Dockerfile (this will be slower the first time)
docker compose --profile dev build --no-cache

# 3. Start containers
docker compose --profile dev up -d

# 4. Verify Playwright works
docker exec microcement-app-dev-1 pnpm run test:e2e
```

## Rollback

If you need to rollback to Alpine:

1. Revert `Dockerfile` changes
2. Restore `playwright.config.ts` to force regular Chromium
3. Restore `docker-compose.yml` entrypoint
4. Rebuild containers

## Testing

After migration, verify:

```bash
# Test Chromium
docker exec microcement-app-dev-1 pnpm exec playwright test --project=chromium

# Test Firefox
docker exec microcement-app-dev-1 pnpm exec playwright test --project=firefox

# Test WebKit (now available!)
docker exec microcement-app-dev-1 pnpm exec playwright test --project=webkit

# Test all browsers
docker exec microcement-app-dev-1 pnpm run test:e2e
```

## Related Files

- `Dockerfile` - Updated to use Debian base
- `playwright.config.ts` - Simplified (removed Alpine workarounds)
- `docker-compose.yml` - Removed entrypoint script
- `docs/PLAYWRIGHT-HEADLESS-SHELL-FIX.md` - Previous Alpine workarounds (now obsolete)

