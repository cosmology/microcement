# Playwright Headless Shell Error - Detailed Explanation

## The Error You're Seeing

```
Error: browserType.launch: Target page, context or browser has been closed
Browser logs:
<launching> /root/.cache/ms-playwright/chromium_headless_shell-1194/chrome-linux/headless_shell
[pid=149][err] Error loading shared library libudev.so.1: No such file or directory
[pid=149][err] Error relocating ... unsupported relocation type 1032
```

## What This Error Means

### 1. **Playwright is Using the Wrong Binary**

Playwright has **two** Chromium binaries:
- **`chromium-1194/chrome-linux/chrome`** ← Regular Chromium (works on Alpine)
- **`chromium_headless_shell-1194/chrome-linux/headless_shell`** ← Headless shell (DOESN'T work on Alpine)

The error shows Playwright is trying to use the **headless shell**, which is incompatible with Alpine Linux.

### 2. **"Unsupported relocation type 1032" - Binary Incompatibility**

This is a **fundamental binary incompatibility**:

- **Headless shell**: Compiled for **glibc** (used by Ubuntu, Debian, CentOS)
- **Alpine Linux**: Uses **musl libc** (lightweight, different ABI)
- **Result**: The binary can't execute because it's trying to use glibc functions that don't exist in musl

This is **NOT** just a missing library - it's that the binary itself is incompatible with Alpine's libc.

### 3. **"Error loading shared library libudev.so.1"**

Even if we fix the symlink, the headless shell still won't work because:
- The binary is incompatible at the ABI level
- Missing library is just one symptom
- The "unsupported relocation type 1032" confirms it's a binary format issue

### 4. **Why Regular Chromium Works**

Regular Chromium (`chrome-linux/chrome`):
- ✅ Has better compatibility layers
- ✅ Works with musl libc
- ✅ Has proper fallbacks for missing libraries
- ✅ Larger binary but more compatible

## The Solution

We've configured Playwright to **explicitly use regular Chromium** instead of the headless shell:

```typescript
executablePath: (() => {
  // Find chromium-* (NOT chromium_headless_shell-*)
  const chromiumDirs = readdirSync(cacheDir).filter(d => 
    d.startsWith('chromium-') && !d.includes('headless_shell')
  );
  // Return path to regular chromium binary
  return chromePath;
})()
```

## Why It Still Happens

If you're still seeing this error, it means:

1. **Config not loaded**: The `executablePath` function might not be executing correctly
2. **Playwright override**: Playwright might be overriding our setting
3. **Cache issue**: Old Playwright cache might be using the wrong binary

## Verification

Check if the fix is working:

```bash
# Run a test and look for this log message:
docker exec microcement-app-dev-1 pnpm run test:e2e --project=chromium e2e/api-health.spec.ts

# Should see:
# ✅ [Playwright] Using regular Chromium (not headless shell): /root/...
```

If you see that message, the fix is working! If you still see `chromium_headless_shell` in the error, the config isn't being applied.

## Complete Fix

The fix includes:
1. ✅ **Explicit executablePath** - Finds and uses regular Chromium
2. ✅ **Filter out headless shell** - Only looks for `chromium-*` directories
3. ✅ **Symlink fix** - Entrypoint ensures `libudev.so.1` exists
4. ✅ **Mobile Chrome** - Also uses regular Chromium

## If Errors Persist

1. **Check config is loaded**: Look for the log message in test output
2. **Verify binary exists**: `docker exec ... ls /root/.cache/ms-playwright/chromium-*/chrome-linux/chrome`
3. **Check symlink**: `docker exec ... ls -la /usr/lib/libudev.so.1`
4. **Rebuild container**: Ensure Dockerfile changes are applied

