#!/usr/bin/env bash
set -euo pipefail

# Unified SHUT DOWN for Microcement (Supabase + App)
# Usage: bash scripts/dev-stop.sh

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SUPABASE_DIR="$ROOT_DIR/supabase"

echo "[stop] Stopping app stack (root compose)"
(
  cd "$ROOT_DIR"
  docker compose --profile dev down --remove-orphans || true
)

echo "[stop] Stopping Supabase stack"
(
  cd "$SUPABASE_DIR"
  docker compose down --remove-orphans || true
)

echo "[stop] Removing lingering containers (mcp helper, etc.)"
docker rm -f microcement-mcp-supabase-1 2>/dev/null || true
docker rm -f microcement-app-dev-1 2>/dev/null || true

echo "[stop] Removing Supabase network and any attached containers"
if docker network inspect supabase_default >/dev/null 2>&1; then
  # Remove any containers still attached to supabase_default
  CONTAINERS=$(docker network inspect supabase_default -f '{{range $k,$v := .Containers}}{{$k}} {{end}}')
  if [ -n "${CONTAINERS:-}" ]; then
    echo "[stop] Forcibly removing containers on supabase_default: $CONTAINERS"
    docker rm -f $CONTAINERS 2>/dev/null || true
  fi
  docker network rm supabase_default 2>/dev/null || true
fi

echo "[stop] Networks prune (safe)"
docker network prune -f 2>/dev/null || true

echo "[stop] Done."


