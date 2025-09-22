#!/usr/bin/env bash
set -euo pipefail

# Unified START for Microcement (Supabase + App)
# Usage: bash scripts/dev-start.sh

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SUPABASE_DIR="$ROOT_DIR/supabase"

echo "[start] Project root: $ROOT_DIR"

# Ensure .env is loaded from project root for docker compose
if [ -f "$ROOT_DIR/.env" ]; then
  echo "[start] Found .env in project root."
else
  echo "[start] WARNING: No .env in project root. Copy env.example to .env and set values."
fi

echo "[start] Bringing up Supabase stack (arm64 default if on Apple Silicon)"
(
  cd "$SUPABASE_DIR"
  # Pull all services except mailhog to avoid amd64-only image on ARM
  DOCKER_DEFAULT_PLATFORM=${DOCKER_DEFAULT_PLATFORM:-linux/arm64} docker compose pull studio kong auth rest realtime storage imgproxy meta functions analytics db vector supavisor liquibase || true
  # Avoid blocking startup on ARM or slow healthchecks by scaling out optional services
  DOCKER_DEFAULT_PLATFORM=${DOCKER_DEFAULT_PLATFORM:-linux/arm64} docker compose up -d --remove-orphans --scale mailhog=0 --scale analytics=0
)

echo "[start] Waiting for Postgres health..."
sleep 5

echo "[start] Running Liquibase migrations"
(
  cd "$SUPABASE_DIR"
  docker compose run --rm liquibase liquibase update | cat
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

    # Ensure auth schema exists and is owned by supabase_auth_admin; drop conflicting functions so migrations can recreate
    docker compose exec -T db psql -U postgres \
      -c "CREATE SCHEMA IF NOT EXISTS auth AUTHORIZATION supabase_auth_admin;" \
      -c "ALTER SCHEMA auth OWNER TO supabase_auth_admin;" \
      -c "GRANT USAGE ON SCHEMA auth TO supabase_auth_admin;" \
      -c "DROP FUNCTION IF EXISTS auth.email() CASCADE;" \
      -c "DO \$\$ BEGIN IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='auth' AND p.proname='uid') THEN EXECUTE 'DROP FUNCTION auth.uid() CASCADE'; END IF; END \$\$;" \
      -c "DO \$\$ BEGIN IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='auth' AND p.proname='role') THEN EXECUTE 'DROP FUNCTION auth.role() CASCADE'; END IF; END \$\$;" | cat || true

    docker compose restart rest auth realtime storage kong >/dev/null 2>&1 || true
  fi
)

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

echo "[start] Starting app stack from project root (profile: dev)"
(
  cd "$ROOT_DIR"
  docker compose --profile dev up -d --build --remove-orphans
)

echo "[start] Status overview:\n"
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}' | sed 's/^/[start] /'

echo "[start] Done. Visit http://localhost:3000 and Supabase Studio at http://localhost:8000"


