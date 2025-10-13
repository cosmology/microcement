#!/bin/bash
set -e

# Script to dump production Supabase database and restore to local using Docker
# This works even if pg_dump is not installed locally

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

echo "🔄 Dumping production database using Docker..."
docker exec $LOCAL_CONTAINER pg_dump \
  -h $PROD_DB_HOST \
  -p $PROD_DB_PORT \
  -U $PROD_DB_USER \
  -d $PROD_DB_NAME \
  --schema=public \
  -F p \
  > $DUMP_FILE

echo "✅ Production database dumped to $DUMP_FILE"
echo "📊 File size: $(du -h $DUMP_FILE | cut -f1)"

echo ""
echo "⚠️  To restore this dump to local, run:"
echo "   cat $DUMP_FILE | docker exec -i $LOCAL_CONTAINER psql -U postgres -d postgres"
echo ""
echo "⚠️  WARNING: This will overwrite your local data!"

