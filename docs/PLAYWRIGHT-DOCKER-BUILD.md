# Playwright Browsers in Docker Build

## Overview

Playwright browsers are now **automatically installed during Docker build**, so they're available from the first container start without manual installation.

## What's Included in Dockerfile

The `deps` stage of the Dockerfile includes:

1. **System Dependencies** (all required libraries):
   - `libc6-compat`, `nss`, `freetype`, `harfbuzz`
   - `alsa-lib`, `cups-libs`
   - `libxkbcommon`, `libxcomposite`, `libxdamage`, `libxfixes`, `libxrandr`
   - `gtk+3.0`, `gdk-pixbuf`
   - `mesa-gbm`, `eudev`
   - **libudev.so.1 symlink** (required for Chromium headless shell)

2. **Playwright Browsers**:
   - Chromium (installed during build)
   - Firefox (installed during build)
   - WebKit (skipped - Alpine compatibility issues)

## Build Process

When you build the Docker image:

```bash
docker compose --profile dev build --no-cache
```

The build process will:
1. Install all system dependencies
2. Install Node.js dependencies (pnpm)
3. **Install Playwright browsers** (chromium + firefox)
4. Verify browsers are installed correctly

## First Run After Build

After building and starting containers:

```bash
docker compose --profile dev up -d
```

Browsers are already installed! You can immediately run tests:

```bash
docker exec microcement-app-dev-1 pnpm run test:e2e
```

**No manual browser installation needed!**

## Verification

To verify browsers are installed in a container:

```bash
# Check Chromium
docker exec microcement-app-dev-1 ls -la /root/.cache/ms-playwright/chromium-*/chrome-linux/chrome

# Check Firefox
docker exec microcement-app-dev-1 ls -d /root/.cache/ms-playwright/firefox-*

# Run a quick test
docker exec microcement-app-dev-1 pnpm run test:e2e --project=chromium e2e/api-health.spec.ts
```

## Troubleshooting

### Browsers Not Found After Rebuild

If browsers are missing after rebuilding:

1. **Check build logs** for installation errors:
   ```bash
   docker compose --profile dev build 2>&1 | grep -i "playwright\|chromium\|firefox"
   ```

2. **Manually install** (if needed):
   ```bash
   docker exec microcement-app-dev-1 pnpm exec playwright install chromium firefox
   ```

3. **Verify dependencies**:
   ```bash
   docker exec microcement-app-dev-1 apk list | grep -E "eudev|mesa-gbm|nss"
   ```

### Build Fails During Browser Installation

If `playwright install` fails during build:

1. Check if all system dependencies are installed (see Dockerfile)
2. Try installing without `--with-deps` (deps already installed)
3. Check network connectivity during build (browsers are downloaded)

### Container Restart Loses Browsers

If browsers disappear after container restart:

1. **Check for volume mounts** that might override `/root/.cache`:
   ```bash
   docker inspect microcement-app-dev-1 | grep -A 10 Mounts
   ```

2. **Browsers should persist** - they're baked into the image during build
3. If using volumes, ensure `/root/.cache` is not overridden

## Cache Optimization

The browser installation is cached in Docker layers. If you only change code:

- **Browser installation step is cached** (faster rebuilds)
- **Only code changes trigger new layers**

To force browser reinstallation:

```bash
docker compose --profile dev build --no-cache --progress=plain
```

## Size Considerations

- **Chromium**: ~175MB
- **Firefox**: ~88MB
- **Total browser size**: ~263MB

This is added to your Docker image size, but ensures tests work immediately.

## CI/CD

For CI/CD pipelines, browsers are already installed, so you can:

```yaml
# Example GitHub Actions
- name: Run E2E tests
  run: |
    docker compose --profile dev up -d
    docker exec microcement-app-dev-1 pnpm run test:e2e
```

No need to install browsers in CI - they're already in the image!

