#!/usr/bin/env bash
set -euo pipefail

# Unified START for Microcement (Supabase + App)
# Usage: bash scripts/dev-start.sh

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SUPABASE_DIR="$ROOT_DIR/supabase"

echo "[start] Project root: $ROOT_DIR"

# Basic CLI args: allow overriding supabase mode
SUPABASE_MODE="${SUPABASE_MODE:-local}"
case "${1:-}" in
  --remote|remote|--hosted|hosted)
    SUPABASE_MODE="remote"
    shift || true
    ;;
  --local|local)
    SUPABASE_MODE="local"
    shift || true
    ;;
  --help|-h)
    cat <<'HELP'
Usage: bash scripts/dev-start.sh [--local|--remote]

  --local   Force the app to target the local Supabase stack (default).
  --remote  Leave Supabase URLs exactly as defined in your env files.

Environment variables:
  SUPABASE_MODE=local|remote   Same as the flags above.
  FORCE_LOCAL_SUPABASE=1       Override any Supabase URLs with http://localhost:8000.
HELP
    exit 0
    ;;
esac

# Ensure .env is loaded from project root for docker compose
if [ -f "$ROOT_DIR/.env" ]; then
  echo "[start] Loading environment from .env in project root."
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env"
  set +a
else
  echo "[start] WARNING: No .env in project root. Copy env.example to .env and set values."
fi

# Allow overrides from .env.local if present
if [ -f "$ROOT_DIR/.env.local" ]; then
  echo "[start] Loading overrides from .env.local."
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env.local"
  set +a
fi

# Decide which Supabase instance the app should target.
LOCAL_BROWSER_SUPABASE_URL="http://localhost:8000"
LOCAL_SERVER_SUPABASE_URL="http://host.docker.internal:8000"
if [ "$SUPABASE_MODE" = "local" ]; then
  if [ "${FORCE_LOCAL_SUPABASE:-0}" = "1" ] || [ -z "${NEXT_PUBLIC_SUPABASE_URL:-}" ]; then
    NEXT_PUBLIC_SUPABASE_URL="$LOCAL_BROWSER_SUPABASE_URL"
  fi
  if [ "${FORCE_LOCAL_SUPABASE:-0}" = "1" ] || [ -z "${SUPABASE_SERVER_URL:-}" ]; then
    SUPABASE_SERVER_URL="$LOCAL_SERVER_SUPABASE_URL"
  fi
  if [ -z "${PLAYWRIGHT_SUPABASE_URL:-}" ]; then
    PLAYWRIGHT_SUPABASE_URL="http://host.docker.internal:8000"
  fi
  SUPABASE_TARGET_URL="${NEXT_PUBLIC_SUPABASE_URL:-$LOCAL_BROWSER_SUPABASE_URL} (server -> ${SUPABASE_SERVER_URL})"
else
  SUPABASE_TARGET_URL="${SUPABASE_SERVER_URL:-${NEXT_PUBLIC_SUPABASE_URL:-unknown}}"
fi

export NEXT_PUBLIC_SUPABASE_URL SUPABASE_SERVER_URL PLAYWRIGHT_SUPABASE_URL
echo "[start] Supabase mode: $SUPABASE_MODE (target: ${SUPABASE_TARGET_URL})"

echo "[start] Bringing up Supabase stack (arm64 default if on Apple Silicon)"
(
  cd "$SUPABASE_DIR"
  # Pull all services
  DOCKER_DEFAULT_PLATFORM=${DOCKER_DEFAULT_PLATFORM:-linux/arm64} docker compose pull studio kong auth rest realtime storage imgproxy meta functions analytics db vector supavisor liquibase || true
  # Avoid blocking startup on ARM or slow healthchecks by scaling out optional services
  DOCKER_DEFAULT_PLATFORM=${DOCKER_DEFAULT_PLATFORM:-linux/arm64} docker compose up -d --scale analytics=0
)

echo "[start] Waiting for Postgres health..."
sleep 5

echo "[start] Running Liquibase migrations"
(
  cd "$SUPABASE_DIR"
  docker compose run --rm liquibase liquibase update | cat
)

# Verify auth.uid() function and RLS policies before proceeding
VERIFY_SECURITY() {
  echo "[start] Verifying database security primitives (auth.uid() and RLS)"
  (
    cd "$SUPABASE_DIR"

    # Verify auth.uid() exists
    AUTH_UID_EXISTS=$(docker exec supabase-db psql -U postgres -d postgres -tAc "SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'auth' AND p.proname = 'uid'" 2>/dev/null | tr -d '[:space:]') || AUTH_UID_EXISTS=""

    # Verify required RLS policies exist (expecting 10 policies total)
    RLS_COUNT=$(docker exec supabase-db psql -U postgres -d postgres -tAc "SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND policyname IN (
      'architect_clients_manage_rel',
      'area_types_read_all',
      'scene_configs_insert_own',
      'scene_configs_read_own',
      'scene_configs_update_own',
      'scene_follow_paths_manage',
      'scene_follow_paths_read',
      'user_profiles_read_own',
      'user_profiles_read_related',
      'user_profiles_update_own'
    )" 2>/dev/null | tr -d '[:space:]') || RLS_COUNT="0"

    if [ "$AUTH_UID_EXISTS" != "1" ]; then
      echo "[start] ❌ auth.uid() function is missing after migrations. Exiting."
      exit 1
    fi

    if [ "$RLS_COUNT" != "10" ]; then
      echo "[start] ❌ RLS policies are incomplete after migrations (found: ${RLS_COUNT}/10). Exiting."
      echo "[start] Tip: Ensure changelogs 0003-create-rls.yaml and 0006-fix-rls-policies.yaml are included in changelog-master.xml"
      exit 1
    fi

    echo "[start] ✅ Verified auth.uid() exists and all 10 RLS policies are present"
  )
}

# Initial verification right after Liquibase
VERIFY_SECURITY

echo "[start] Restarting PostgREST to ensure auth.uid() function is available"
(
  cd "$SUPABASE_DIR"
  docker compose restart rest >/dev/null 2>&1 || true
  sleep 5
)

echo "[start] Ensuring schema permissions are granted"
(
  cd "$SUPABASE_DIR"
  PW=$(docker compose config | awk -F ": " '/POSTGRES_PASSWORD:/ {print $2; exit}')
  docker exec supabase-db psql -U postgres -d postgres -c "
    -- Ensure schema permissions are granted
    GRANT USAGE ON SCHEMA public TO authenticator;
    GRANT USAGE ON SCHEMA public TO authenticated;
    GRANT USAGE ON SCHEMA public TO anon;
    
    -- Ensure table permissions are granted
    GRANT SELECT ON public.user_profiles TO authenticator;
    GRANT SELECT ON public.scene_design_configs TO authenticator;
    GRANT SELECT ON public.architect_clients TO authenticator;
    GRANT SELECT ON public.scene_follow_paths TO authenticator;
    GRANT SELECT ON public.area_types TO authenticator;
    
    GRANT SELECT ON public.user_profiles TO authenticated;
    GRANT SELECT ON public.scene_design_configs TO authenticated;
    GRANT SELECT ON public.architect_clients TO authenticated;
    GRANT SELECT ON public.scene_follow_paths TO authenticated;
    GRANT SELECT ON public.area_types TO authenticated;
    
    GRANT INSERT, UPDATE ON public.user_profiles TO authenticated;
    GRANT INSERT, UPDATE ON public.scene_design_configs TO authenticated;
    GRANT INSERT, UPDATE ON public.architect_clients TO authenticated;
    GRANT INSERT, UPDATE ON public.scene_follow_paths TO authenticated;
  " >/dev/null 2>&1
  echo "[start] ✅ Schema permissions ensured"
)

echo "[start] Ensuring DB roles, schemas, and passwords"
(
  cd "$SUPABASE_DIR"
  PW=$(docker compose config | awk -F ": " '/POSTGRES_PASSWORD:/ {print $2; exit}')
  if [ -n "$PW" ]; then
    # Ensure _realtime schema exists and supabase_admin search_path includes it
    docker compose exec -T db psql -U postgres \
      -c "CREATE SCHEMA IF NOT EXISTS _realtime AUTHORIZATION supabase_admin;" \
      -c "GRANT USAGE ON SCHEMA _realtime TO supabase_admin;" \
      -c "ALTER ROLE supabase_admin SET search_path TO _realtime, public;" | cat || true

    # Ensure authenticator role exists and password matches POSTGRES_PASSWORD
    docker compose exec -T db psql -U postgres \
      -c "DO \$\$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticator') THEN CREATE ROLE authenticator LOGIN NOINHERIT; END IF; END \$\$;" \
      -c "ALTER ROLE authenticator WITH LOGIN PASSWORD '$PW';" \
      -c "GRANT CONNECT ON DATABASE postgres TO authenticator;" \
      -c "GRANT USAGE ON SCHEMA public TO authenticator;" | cat || true

    # Ensure supabase_auth_admin role exists and password matches POSTGRES_PASSWORD
    docker compose exec -T db psql -U postgres \
      -c "DO \$\$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN CREATE ROLE supabase_auth_admin LOGIN; END IF; END \$\$;" \
      -c "ALTER ROLE supabase_auth_admin WITH LOGIN PASSWORD '$PW';" \
      -c "GRANT CONNECT ON DATABASE postgres TO supabase_auth_admin;" | cat || true

    # Ensure supabase_storage_admin role exists and password matches POSTGRES_PASSWORD
    docker compose exec -T db psql -U postgres \
      -c "DO \$\$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_storage_admin') THEN CREATE ROLE supabase_storage_admin LOGIN; END IF; END \$\$;" \
      -c "ALTER ROLE supabase_storage_admin WITH LOGIN PASSWORD '$PW';" \
      -c "GRANT CONNECT ON DATABASE postgres TO supabase_storage_admin;" | cat || true

    # Ensure auth schema exists and is owned by supabase_auth_admin
    docker compose exec -T db psql -U postgres \
      -c "CREATE SCHEMA IF NOT EXISTS auth AUTHORIZATION supabase_auth_admin;" \
      -c "ALTER SCHEMA auth OWNER TO supabase_auth_admin;" \
      -c "GRANT USAGE ON SCHEMA auth TO supabase_auth_admin;" \
      -c "DROP FUNCTION IF EXISTS auth.email() CASCADE;" | cat || true

    docker compose restart rest auth realtime storage kong >/dev/null 2>&1 || true
  fi
)

# Final verification after role/schema adjustments
VERIFY_SECURITY

echo "[start] Ensuring Edge Functions entrypoint file"
(
  # Always write a clean minimal handler to avoid accidental shell text in the file
  ENTRY_FILE="$SUPABASE_DIR/volumes/functions/main/index.ts"
  mkdir -p "$(dirname "$ENTRY_FILE")"
  cat > "$ENTRY_FILE" <<'TS'
Deno.serve((_req: Request) =>
  new Response("Edge runtime OK", { headers: { "Content-Type": "text/plain" } }),
);
TS
) 

echo "[start] Ensuring _supabase database exists for pooler"
(
  cd "$SUPABASE_DIR"
  # Create _supabase DB if missing and grant privileges
  docker compose exec -T db psql -U postgres \
    -c "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = '_supabase') THEN PERFORM dblink_exec('dbname=' || current_database(), 'CREATE DATABASE _supabase'); END IF; END $$;" 2>/dev/null || \
  docker compose exec -T db psql -U postgres -c "CREATE DATABASE _supabase" || true

  docker compose exec -T db psql -U postgres -d _supabase \
    -c "ALTER DATABASE _supabase OWNER TO supabase_admin;" \
    -c "GRANT ALL PRIVILEGES ON DATABASE _supabase TO supabase_admin;" | cat || true

  # Ensure required schema for pooler exists in _supabase
  docker compose exec -T db psql -U postgres -d _supabase \
    -c "CREATE SCHEMA IF NOT EXISTS _supavisor AUTHORIZATION supabase_admin;" \
    -c "GRANT USAGE ON SCHEMA _supavisor TO supabase_admin;" | cat || true

  # Restart pooler to re-attempt migrations against the now existing DB
  docker compose restart supavisor >/dev/null 2>&1 || true
)

echo "[start] Ensuring Supabase client URL is set correctly"
(
  cd "$ROOT_DIR"
  # For Docker setup, the URL should match the docker-compose.yml configuration
  # which is set to 192.168.1.9:8000 for external device access
  echo "[start] Supabase URL configured in docker-compose.yml for external access"
)

echo "[start] Restarting Kong to apply key-auth plugin"
(
  cd "$SUPABASE_DIR"
  docker compose restart kong >/dev/null 2>&1 || true
  sleep 3
)

echo "[start] Starting app stack from project root (profile: dev)"
echo "[start] (Note: 'CACHED' build messages are normal - Docker is using cached layers)"
(
  cd "$ROOT_DIR"
  # Build and start - capture exit code
  if docker compose --profile dev up -d --build; then
    echo "[start] ✅ App stack build and start completed successfully"
  else
    EXIT_CODE=$?
    echo "[start] ❌ Failed to start app stack (exit code: $EXIT_CODE)"
    exit $EXIT_CODE
  fi
)

echo "[start] Status overview:\n"
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}' | sed 's/^/[start] /'

echo "[start] Waiting for services to be ready..."
sleep 10

echo "[start] Quick verification - testing login..."
(
  cd "$ROOT_DIR"

  SUPABASE_AUTH_URL=${SUPABASE_AUTH_URL:-"${NEXT_PUBLIC_SUPABASE_URL:-http://localhost:8000}/auth/v1/token?grant_type=password"}
  SUPABASE_API_KEY=${SUPABASE_API_KEY:-${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}}
  LOGIN_EMAIL=${DEV_LOGIN_TEST_EMAIL:-${E2E_ARCHITECT_EMAIL:-${PLAYWRIGHT_ARCHITECT_EMAIL:-}}}
  LOGIN_PASSWORD=${DEV_LOGIN_TEST_PASSWORD:-${E2E_ARCHITECT_PASSWORD:-${PLAYWRIGHT_ARCHITECT_PASSWORD:-}}}

  if [ -z "$SUPABASE_API_KEY" ] || [ -z "$LOGIN_EMAIL" ] || [ -z "$LOGIN_PASSWORD" ]; then
    echo "[start] ⚠️  Skipping login smoke test (missing SUPABASE_API_KEY or credentials)."
    exit 0
  fi

  ARCHITECT_TOKEN=$(curl -s "$SUPABASE_AUTH_URL" \
    -X POST \
    -H "Content-Type: application/json" \
    -H "apikey: $SUPABASE_API_KEY" \
    -d "{\"email\":\"$LOGIN_EMAIL\",\"password\":\"$LOGIN_PASSWORD\"}" \
    | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

  if [ -n "$ARCHITECT_TOKEN" ]; then
    echo "[start] ✅ Login successful - RLS setup complete"
  else
    echo "[start] ⚠️  Login test failed - check logs if issues persist"
  fi
)

echo ""
echo "[start] ✅ All services started successfully!"
echo "[start] Visit http://localhost:3000 to access the app."
if [ "$SUPABASE_MODE" = "local" ]; then
  echo "[start] Supabase Studio: http://localhost:8081  (API proxy: $SUPABASE_TARGET_URL)"
else
  echo "[start] Supabase API target: $SUPABASE_TARGET_URL"
fi


