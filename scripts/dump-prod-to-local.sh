#!/bin/bash
set -e

# Script to dump production Supabase database and restore to local
# This requires direct access to production PostgreSQL

# Load environment variables from .env file
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Configuration from environment variables
PROD_DB_HOST="${PROD_DB_HOST:-}"
PROD_DB_PORT="${PROD_DB_PORT:-5432}"
PROD_DB_NAME="${PROD_DB_NAME:-postgres}"
PROD_DB_USER="${PROD_DB_USER:-}"
PROD_DB_PASSWORD="${PROD_DB_PASSWORD:-}"

# Validate required environment variables
if [ -z "$PROD_DB_HOST" ] || [ -z "$PROD_DB_USER" ] || [ -z "$PROD_DB_PASSWORD" ]; then
  echo "❌ Error: Missing required environment variables"
  echo ""
  echo "Please set the following in your .env file:"
  echo "  PROD_DB_HOST=your-supabase-host"
  echo "  PROD_DB_USER=your-db-user"
  echo "  PROD_DB_PASSWORD=your-db-password"
  echo ""
  echo "See env.example for the full template"
  exit 1
fi

LOCAL_CONTAINER="supabase-db"
DUMP_FILE="./supabase/prod_full_dump.sql"

echo "🔄 Dumping production database..."
PGPASSWORD=$PROD_DB_PASSWORD pg_dump \
  -h $PROD_DB_HOST \
  -p $PROD_DB_PORT \
  -U $PROD_DB_USER \
  -d $PROD_DB_NAME \
  --schema=public \
  --schema=auth \
  --schema=storage \
  -F p \
  -f $DUMP_FILE

echo "✅ Production database dumped to $DUMP_FILE"

echo "🗑️  Dropping local database schemas..."
docker exec $LOCAL_CONTAINER psql -U postgres -d postgres -c "
DROP SCHEMA IF EXISTS public CASCADE;
DROP SCHEMA IF EXISTS storage CASCADE;
CREATE SCHEMA public;
CREATE SCHEMA storage;
"

echo "📥 Restoring to local database..."
docker exec -i $LOCAL_CONTAINER psql -U postgres -d postgres < $DUMP_FILE

echo "✅ Database restored successfully!"
echo "🔄 Restarting containers to apply changes..."
docker-compose restart

echo "✅ Done!"

