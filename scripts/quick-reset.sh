#!/bin/bash

# Quick Liquibase Reset Script
# This script quickly resets and runs migrations

echo "🔄 Quick Liquibase Reset"
echo "========================"

# Navigate to supabase directory
cd supabase

# Check if services are running
if ! docker compose ps | grep -q "Up"; then
    echo "Starting Supabase services..."
    docker compose up -d
    sleep 10
fi

# Reset everything
echo "Resetting Liquibase state..."
docker compose exec db psql -U postgres -d postgres -c "
    DROP TABLE IF EXISTS databasechangelog CASCADE;
    DROP TABLE IF EXISTS databasechangeloglock CASCADE;
    DROP TABLE IF EXISTS public.user_scene_configs CASCADE;
    DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
    DELETE FROM auth.users WHERE email IN ('ivanprokic@gmail.com', 'ivanprokic@yahoo.com');
" 2>/dev/null || true

# Run migrations
echo "Running migrations..."
docker compose run --rm liquibase liquibase update

echo "✅ Done! You can now start your app with:"
echo "cd .. && docker compose --profile dev up"
