# Playwright Headless Shell Error Explained

## The Error

```
Error: browserType.launch: Target page, context or browser has been closed
Browser logs:
<launching> /root/.cache/ms-playwright/chromium_headless_shell-1194/chrome-linux/headless_shell
[pid=149][err] Error loading shared library libudev.so.1: No such file or directory
[pid=149][err] Error relocating ... unsupported relocation type 1032
```

## What's Happening

1. **Playwright is using the wrong binary**: It's trying to use `chromium_headless_shell` instead of regular `chromium`
2. **Binary incompatibility**: The headless shell binary is compiled for a different libc/architecture
3. **"Unsupported relocation type 1032"**: This is a binary-level incompatibility - the binary was compiled for glibc (Ubuntu/Debian) but Alpine uses musl libc
4. **Missing library symbols**: Even with libudev installed, the binary can't link properly because it's fundamentally incompatible

## Why This Happens

- **Headless shell**: Lightweight binary designed for headless Chrome, but has compatibility issues
- **Regular Chromium**: Full browser binary that works on Alpine
- **Playwright default**: Tries to use headless shell first (faster, smaller), falls back to regular Chromium

## The Root Cause

The `executablePath` configuration might not be working correctly, or Playwright is still preferring the headless shell even when we specify the regular binary.

## Solution

We need to:
1. **Force Playwright to use regular Chromium** (not headless shell)
2. **Fix the symlink** (entrypoint should handle this)
3. **Optionally disable/remove headless shell** so Playwright can't use it

