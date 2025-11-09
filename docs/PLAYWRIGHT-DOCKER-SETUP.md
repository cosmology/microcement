# Playwright Docker Setup

## Overview

Playwright requires system dependencies to run browsers in Docker containers. This document explains the setup and limitations.

## Dependencies Installed

The Dockerfile includes all necessary dependencies for Playwright browsers:

- **nss, freetype, harfbuzz** - Core browser libraries
- **alsa-lib, cups-libs** - Audio and printing support
- **libxkbcommon, libxcomposite, libxdamage, libxfixes, libxrandr** - X11 libraries
- **gtk+3.0, gdk-pixbuf** - GUI libraries
- **mesa-gbm, eudev** - Graphics and device management

## Installation

### First Time Setup

```bash
# Start the container
docker compose --profile dev up -d

# Find your container name
docker ps | grep app-dev

# Install Playwright browsers (one-time)
docker exec microcement-app-dev-1 pnpm exec playwright install chromium

# Or install all browsers
docker exec microcement-app-dev-1 pnpm exec playwright install chromium firefox webkit
```

## Running Tests

### Headless Mode (Recommended for Docker)

```bash
# Run all tests
docker exec microcement-app-dev-1 pnpm run test:e2e

# Run specific browser
docker exec microcement-app-dev-1 pnpm run test:e2e --project=chromium

# Run specific test file
docker exec microcement-app-dev-1 pnpm run test:e2e e2e/homepage.spec.ts
```

### UI Mode Limitations

**UI mode (`--ui`) does NOT work in Docker containers** because:
- It requires X11 display server
- Containers don't have graphical display by default
- Even with X11 forwarding, it's complex to set up

**Workaround**: Use headless mode instead. All tests work the same, just without the visual UI.

### Debug Mode

```bash
# Run in debug mode (opens browser in headless mode)
docker exec microcement-app-dev-1 pnpm run test:e2e:debug
```

## Viewing Test Reports

After running tests, view the HTML report:

```bash
# Copy report from container to host
docker cp microcement-app-dev-1:/app/playwright-report ./playwright-report-local

# Open in browser
open ./playwright-report-local/index.html
```

Or view screenshots/videos from test failures:
```bash
# Copy test results
docker cp microcement-app-dev-1:/app/test-results ./test-results-local

# View screenshots
open ./test-results-local
```

## Troubleshooting

### Missing Dependencies

If you see errors like "symbol not found" or "No such file or directory":

1. **Check if dependencies are in Dockerfile**: The `deps` stage should include all Playwright dependencies
2. **Rebuild container**: `docker compose --profile dev build --no-cache`
3. **Reinstall browsers**: `docker exec <container> pnpm exec playwright install chromium`

### Browser Launch Errors

If browsers fail to launch:

1. Check container logs: `docker logs microcement-app-dev-1`
2. Verify dependencies: `docker exec microcement-app-dev-1 apk list | grep -E "mesa-gbm|eudev|nss"`
3. Try running with verbose logging: `docker exec microcement-app-dev-1 pnpm run test:e2e --reporter=list --verbose`

### Port Issues

If tests fail to connect to `localhost:3000`:

1. Verify dev server is running: `docker ps | grep app-dev`
2. Check if port is accessible: `docker exec microcement-app-dev-1 wget -qO- http://localhost:3000`
3. Ensure `baseURL` in `playwright.config.ts` matches your server URL

## Alternative: Run Tests Locally

If Docker setup is problematic, you can run tests locally:

```bash
# Install dependencies locally (if you have Node.js/pnpm)
pnpm install

# Install browsers locally
pnpm exec playwright install chromium

# Run tests (assumes dev server is running on localhost:3000)
pnpm run test:e2e
```

## CI/CD Considerations

For CI/CD pipelines:

1. **Use headless mode only** (no UI mode)
2. **Install browsers in CI**: Add `pnpm exec playwright install --with-deps chromium` to your CI script
3. **Cache browser binaries**: Cache `~/.cache/ms-playwright` directory between builds
4. **Use GitHub Actions**: Playwright has official GitHub Actions with built-in browser installation

Example GitHub Actions:
```yaml
- uses: microsoft/playwright@v1.40.0
- run: pnpm exec playwright install --with-deps chromium
- run: pnpm run test:e2e
```

## References

- [Playwright Docker Documentation](https://playwright.dev/docs/docker)
- [Playwright System Requirements](https://playwright.dev/docs/troubleshooting#system-requirements)
- [Alpine Linux Package Search](https://pkgs.alpinelinux.org/packages)

