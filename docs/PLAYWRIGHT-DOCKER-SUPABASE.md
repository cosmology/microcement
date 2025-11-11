# Playwright Docker + Supabase Configuration

## Problem

When running Playwright tests inside a Docker container, authentication tests may fail with connection errors like:
```
Error: connect ECONNREFUSED 192.168.1.9:8000
```

This happens because:
1. The app container uses `NEXT_PUBLIC_SUPABASE_URL=http://192.168.1.9:8000` (external IP for device access)
2. From inside the container, `192.168.1.9` might not be accessible
3. Tests need to authenticate via Supabase API, which requires a URL accessible from the container

## Solution

The authentication helper (`e2e/fixtures/auth.ts`) automatically detects when you're in a Docker container and uses the appropriate URL:

1. **For authentication (Node.js context)**: Uses `host.docker.internal:8000` to reach Supabase on the host
2. **For browser storage key**: Uses `NEXT_PUBLIC_SUPABASE_URL` (what the browser expects)

## Configuration

### Option 1: Automatic Detection (Recommended)

The helper automatically detects external IPs and uses `host.docker.internal`:

```typescript
// If NEXT_PUBLIC_SUPABASE_URL=http://192.168.1.9:8000
// Authentication will use: http://host.docker.internal:8000
// Storage key will use: http://192.168.1.9:8000 (browser URL)
```

### Option 2: Explicit Override

Set `PLAYWRIGHT_SUPABASE_URL` in your `.env` or `docker-compose.yml`:

```bash
# In .env
PLAYWRIGHT_SUPABASE_URL=http://host.docker.internal:8000
```

Or in `docker-compose.yml`:
```yaml
environment:
  - PLAYWRIGHT_SUPABASE_URL=http://host.docker.internal:8000
```

### Option 3: Use Docker Network (If Containers Are Networked)

If your app container and Supabase are on the same Docker network, you can use the service name:

```bash
# In .env
PLAYWRIGHT_SUPABASE_URL=http://kong:8000
```

## Docker Compose Configuration

The `docker-compose.yml` now includes:

```yaml
services:
  app-dev:
    extra_hosts:
      - "host.docker.internal:host-gateway"
    environment:
      - PLAYWRIGHT_SUPABASE_URL=${PLAYWRIGHT_SUPABASE_URL:-}
```

This enables `host.docker.internal` to work on all platforms (Mac, Windows, Linux).

## Platform-Specific Notes

### macOS/Windows (Docker Desktop)

`host.docker.internal` works out of the box. No additional configuration needed.

### Linux

`host.docker.internal` is enabled via `extra_hosts` in docker-compose.yml. If you're using Docker directly (not Docker Compose), add:

```bash
docker run --add-host=host.docker.internal:host-gateway ...
```

## Troubleshooting

### Connection Refused

**Error**: `ECONNREFUSED 192.168.1.9:8000`

**Solution**:
1. Check if Supabase is running: `docker compose ps` (in supabase directory)
2. Verify port 8000 is exposed: `curl http://localhost:8000/health`
3. Set `PLAYWRIGHT_SUPABASE_URL=http://host.docker.internal:8000` in your environment

### Storage Key Mismatch

**Problem**: Authentication works but session isn't recognized by browser

**Solution**: 
- The storage key is automatically matched to the browser URL
- Ensure `NEXT_PUBLIC_SUPABASE_URL` is set correctly
- The helper uses `NEXT_PUBLIC_SUPABASE_URL` for storage keys, not the auth URL

### Linux: host.docker.internal Not Working

**Solution**:
1. Ensure `extra_hosts` is in docker-compose.yml (already added)
2. Or manually add: `--add-host=host.docker.internal:host-gateway`
3. Or use the actual host IP address instead

## Testing

Run tests to verify configuration:

```bash
# Run authentication tests
docker exec microcement-app-dev-1 pnpm run test:e2e e2e/authentication.spec.ts

# Check if Supabase is accessible from container
docker exec microcement-app-dev-1 sh -c "curl -I http://host.docker.internal:8000/health"
```

## Summary

- **Authentication URL**: Automatically uses `host.docker.internal:8000` when external IP detected
- **Storage Key**: Uses `NEXT_PUBLIC_SUPABASE_URL` (what browser expects)
- **Configuration**: Can override with `PLAYWRIGHT_SUPABASE_URL` environment variable
- **Docker Setup**: `extra_hosts` enables `host.docker.internal` on all platforms

For more information, see:
- `e2e/fixtures/auth.ts` - Authentication helper implementation
- `docs/PLAYWRIGHT-AUTHENTICATION-TESTS.md` - Authentication testing guide

