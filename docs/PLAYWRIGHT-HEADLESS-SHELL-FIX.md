# Playwright Headless Shell Fix - Complete Solution

## Problem Summary

Playwright was trying to use `chromium_headless_shell` which is incompatible with Alpine Linux ARM64 due to:
1. **Binary incompatibility**: Headless shell is compiled for glibc, Alpine uses musl libc
2. **Missing library**: `libudev.so.1` not found
3. **Symbol errors**: "unsupported relocation type 1032", "posix_fallocate64: symbol not found"

## Root Cause

Even when we set `executablePath` to point to regular Chromium, Playwright **still prefers headless shell** in some scenarios. This is a known behavior in Playwright where it checks for headless shell first.

## Solution Applied

### 1. **Symlink Approach** (Current)
- Create symlink: `chromium_headless_shell-*/chrome-linux/headless_shell` → `chromium-*/chrome-linux/chrome`
- When Playwright requests headless shell, it actually gets regular Chromium
- This works because Playwright checks for the file existence, not the binary type

### 2. **Configuration**
- Set `executablePath` in both global `use` section and project-specific config
- Explicitly filter out `chromium_headless_shell` directories when finding Chromium
- Set in `launchOptions` as well

### 3. **Library Fixes**
- Create `libudev.so.1` symlink to `libudev.so.0` (required by Chromium)
- Ensure symlinks exist on container start via entrypoint script

## Current Status

✅ **Symlink created**: Headless shell path points to regular Chromium
✅ **Config updated**: Both global and project-specific executablePath set
⚠️ **Remaining issue**: Regular Chromium still has library compatibility issues with Alpine

## Next Steps

If regular Chromium also fails on Alpine, consider:
1. **Install glibc compatibility layer** (might increase image size significantly)
2. **Use Debian-based Node image** instead of Alpine (larger but more compatible)
3. **Use Firefox only** for E2E tests (Firefox works better on Alpine)
4. **Run tests in CI** on Ubuntu/Debian instead of Alpine

## Files Modified

- `playwright.config.ts` - Added executablePath configuration
- `Dockerfile` - Added symlink creation and entrypoint script
- `docker-compose.yml` - Already has entrypoint configured

