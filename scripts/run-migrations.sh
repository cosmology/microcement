#!/bin/bash

# Simple Migration Runner
# This script properly runs Liquibase migrations

echo "🔧 Running Database Migrations"
echo "=============================="

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

# Run Liquibase migration using run --rm (this handles the container lifecycle properly)
print_status "Running Liquibase migrations..."
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
        print_success "🎉 Database is ready!"
    else
        print_error "❌ user_scene_configs table does not exist!"
        exit 1
    fi
else
    print_error "❌ Migrations failed with exit code: $MIGRATION_EXIT_CODE"
    exit 1
fi
