#!/bin/bash

# Complete Liquibase Reset Script
# This script completely resets Liquibase state and runs migrations fresh

echo "🔄 Complete Liquibase Reset"
echo "=========================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Navigate to supabase directory
cd supabase

# Check if services are running
print_status "Checking if Supabase services are running..."
if ! docker compose ps | grep -q "Up"; then
    print_status "Starting Supabase services..."
    docker compose up -d
    sleep 10
fi

# Completely reset Liquibase state
print_status "Resetting Liquibase state..."
docker compose exec db psql -U postgres -d postgres -c "
    DROP TABLE IF EXISTS databasechangelog CASCADE;
    DROP TABLE IF EXISTS databasechangeloglock CASCADE;
" 2>/dev/null || true

# Drop the user_scene_configs table if it exists
print_status "Dropping existing user_scene_configs table..."
docker compose exec db psql -U postgres -d postgres -c "
    DROP TABLE IF EXISTS public.user_scene_configs CASCADE;
    DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
" 2>/dev/null || true

# Clean up any test users that might exist
print_status "Cleaning up test users..."
docker compose exec db psql -U postgres -d postgres -c "
    DELETE FROM auth.users WHERE email IN ('ivanprokic@gmail.com', 'ivanprokic@yahoo.com');
" 2>/dev/null || true

# Run Liquibase migration fresh
print_status "Running Liquibase migrations fresh..."
echo "----------------------------------------"
docker compose run --rm liquibase liquibase update
MIGRATION_EXIT_CODE=$?

if [ $MIGRATION_EXIT_CODE -eq 0 ]; then
    print_success "✅ Migrations completed successfully!"
    
    # Verify the table exists
    print_status "Verifying user_scene_configs table..."
    TABLE_EXISTS=$(docker compose exec db psql -U postgres -d postgres -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_scene_configs');" | tr -d ' \n')
    
    if [ "$TABLE_EXISTS" = "t" ]; then
        print_success "✅ user_scene_configs table exists!"
        
        # Show table structure
        print_status "Table structure:"
        docker compose exec db psql -U postgres -d postgres -c "\d public.user_scene_configs"
        
        # Show policies
        print_status "RLS policies:"
        docker compose exec db psql -U postgres -d postgres -c "SELECT policyname FROM pg_policies WHERE tablename = 'user_scene_configs';"
        
        print_success "🎉 Database is ready!"
    else
        print_error "❌ user_scene_configs table does not exist!"
        exit 1
    fi
else
    print_error "❌ Migrations failed with exit code: $MIGRATION_EXIT_CODE"
    print_error "Check the logs above for details."
    exit 1
fi
