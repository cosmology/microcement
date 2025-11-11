#!/bin/bash

# Quick Migration Status Checker
# This script starts Supabase and shows migration status without starting the app

echo "🔍 Checking Migration Status"
echo "============================"

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

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Step 1: Start Supabase services
print_status "Starting Supabase services..."
cd supabase
docker compose up -d

# Step 2: Wait for services to be ready
print_status "Waiting for services to be ready..."
sleep 10

# Step 3: Check if services are running
print_status "Checking service status..."
docker compose ps

# Step 4: Run Liquibase migrations with detailed output
print_status "Running Liquibase migrations..."
echo "----------------------------------------"
docker compose exec liquibase liquibase update
MIGRATION_EXIT_CODE=$?

if [ $MIGRATION_EXIT_CODE -eq 0 ]; then
    print_success "✅ Migrations completed successfully!"
else
    print_error "❌ Migrations failed with exit code: $MIGRATION_EXIT_CODE"
    echo "Check the logs above for details."
    exit 1
fi

# Step 5: Verify migrations
print_status "Verifying migrations..."
echo "----------------------------------------"
docker compose exec db psql -U postgres -d postgres -c "\dt public.*"

# Step 6: Check if user_scene_configs table exists
print_status "Checking if user_scene_configs table exists..."
TABLE_EXISTS=$(docker compose exec db psql -U postgres -d postgres -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_scene_configs');" | tr -d ' \n')

if [ "$TABLE_EXISTS" = "t" ]; then
    print_success "✅ user_scene_configs table exists!"
    
    # Show table structure
    print_status "Table structure:"
    docker compose exec db psql -U postgres -d postgres -c "\d public.user_scene_configs"
    
    print_success "🎉 Everything is ready! You can now start your app with:"
    echo "cd .. && docker compose --profile dev up"
else
    print_error "❌ user_scene_configs table does not exist!"
    print_error "Migrations may have failed. Check the logs above."
    exit 1
fi
