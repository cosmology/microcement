#!/bin/bash

# Fixed One-Liner Script for Microcement Project
# This script properly handles the Liquibase service lifecycle

echo "🚀 Starting Microcement Development Environment"
echo "=============================================="

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

# Step 1: Start Supabase services (without liquibase)
print_status "Starting Supabase services..."
cd supabase

# Start all services except liquibase first
docker compose up -d db auth rest realtime storage imgproxy meta analytics kong studio mailhog supavisor vector

# Step 2: Wait for database to be ready
print_status "Waiting for database to be ready..."
sleep 15

# Step 3: Check if database is healthy
print_status "Checking database health..."
DB_HEALTH=$(docker compose exec db pg_isready -U postgres 2>/dev/null && echo "healthy" || echo "unhealthy")

if [ "$DB_HEALTH" != "healthy" ]; then
    print_error "Database is not ready. Waiting longer..."
    sleep 10
fi

# Step 4: Run Liquibase migration (this will start and stop the container)
print_status "Running Liquibase migrations..."
echo "----------------------------------------"
docker compose run --rm liquibase liquibase update
MIGRATION_EXIT_CODE=$?

if [ $MIGRATION_EXIT_CODE -eq 0 ]; then
    print_success "✅ Migrations completed successfully!"
else
    print_error "❌ Migrations failed with exit code: $MIGRATION_EXIT_CODE"
    print_error "Check the logs above for details."
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
else
    print_error "❌ user_scene_configs table does not exist!"
    print_error "Migrations may have failed. Check the logs above."
    exit 1
fi

# Step 7: Start remaining services
print_status "Starting remaining Supabase services..."
docker compose up -d

# Step 8: Go back to project root and start the app
print_status "Starting Next.js application..."
cd ..
docker compose --profile dev up
