#!/bin/bash

# Complete Reset Script for Microcement Project
# This script will clean everything and restart from scratch

echo "🧹 Complete Reset Script for Microcement Project"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Check if Docker is running
if ! docker info &> /dev/null; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

print_status "Starting complete reset process..."

# Step 1: Stop all running containers
print_status "Stopping all running containers..."
docker compose down --remove-orphans

# Step 2: Remove all volumes (this will delete all data)
print_warning "Removing all volumes (this will delete all data)..."
docker volume prune -f
docker volume rm $(docker volume ls -q) 2>/dev/null || true

# Step 3: Remove all containers
print_status "Removing all containers..."
docker container prune -f

# Step 4: Remove all images (optional - uncomment if you want to rebuild everything)
# print_status "Removing all images..."
# docker image prune -a -f

# Step 5: Clean up any remaining Supabase volumes
print_status "Cleaning up Supabase volumes..."
docker volume rm supabase_db_data 2>/dev/null || true
docker volume rm supabase_api_data 2>/dev/null || true
docker volume rm supabase_functions_data 2>/dev/null || true
docker volume rm supabase_logs_data 2>/dev/null || true
docker volume rm supabase_pooler_data 2>/dev/null || true

# Step 6: Remove any existing Supabase containers
print_status "Removing existing Supabase containers..."
docker rm -f supabase-db 2>/dev/null || true
docker rm -f supabase-api 2>/dev/null || true
docker rm -f supabase-functions 2>/dev/null || true
docker rm -f supabase-liquibase 2>/dev/null || true

# Step 7: Clean up any remaining networks
print_status "Cleaning up networks..."
docker network prune -f

# Step 8: Start fresh
print_status "Starting fresh Supabase instance..."
docker compose up -d

# Step 9: Wait for services to be ready
print_status "Waiting for services to be ready..."
sleep 10

# Step 10: Check if services are running
print_status "Checking service status..."
docker compose ps

# Step 11: Run Liquibase migrations
print_status "Running Liquibase migrations..."
docker compose exec liquibase liquibase update

# Step 12: Verify migrations
print_status "Verifying migrations..."
docker compose exec db psql -U postgres -d postgres -c "\dt public.*"

# Step 13: Check if user_scene_configs table exists
print_status "Checking if user_scene_configs table exists..."
TABLE_EXISTS=$(docker compose exec db psql -U postgres -d postgres -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_scene_configs');" | tr -d ' \n')

if [ "$TABLE_EXISTS" = "t" ]; then
    print_success "user_scene_configs table exists!"
else
    print_error "user_scene_configs table does not exist!"
fi

# Step 14: Show final status
print_status "Final service status:"
docker compose ps

print_success "Reset complete! All services are running fresh."
echo ""
print_status "Next steps:"
echo "1. Test your application at http://localhost:3000"
echo "2. Check Supabase dashboard at http://localhost:8000"
echo "3. Verify authentication flow"
echo "4. Test scene configuration creation"
echo ""
print_status "Useful commands:"
echo "- View logs: docker compose logs -f"
echo "- Stop services: docker compose down"
echo "- Restart services: docker compose restart"
echo "- Check database: docker compose exec db psql -U postgres -d postgres"
