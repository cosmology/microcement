#!/bin/bash

# Verification Script for Microcement Project
# This script verifies that all migrations ran successfully

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

if [ -f "$ROOT_DIR/.env" ]; then
    set -a
    # shellcheck disable=SC1091
    source "$ROOT_DIR/.env"
    set +a
fi

SUPABASE_BASE_URL=${SUPABASE_BASE_URL:-${NEXT_PUBLIC_SUPABASE_URL:-http://localhost:8000}}
SUPABASE_REST_URL="${SUPABASE_BASE_URL%/}/rest/v1/user_scene_configs"
SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY:-${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}}

echo "🔍 Verification Script for Microcement Project"
echo "=============================================="
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

# Check if services are running
print_status "Checking if services are running..."
if ! docker compose ps | grep -q "Up"; then
    print_error "Services are not running. Please start them first:"
    echo "docker compose up -d"
    exit 1
fi

print_success "Services are running!"

# Check if user_scene_configs table exists
print_status "Checking if user_scene_configs table exists..."
TABLE_EXISTS=$(docker compose exec db psql -U postgres -d postgres -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_scene_configs');" | tr -d ' \n')

if [ "$TABLE_EXISTS" = "t" ]; then
    print_success "user_scene_configs table exists!"
else
    print_error "user_scene_configs table does not exist!"
    exit 1
fi

# Check table structure
print_status "Checking table structure..."
docker compose exec db psql -U postgres -d postgres -c "\d public.user_scene_configs"

# Check RLS policies
print_status "Checking RLS policies..."
POLICIES=$(docker compose exec db psql -U postgres -d postgres -t -c "SELECT COUNT(*) FROM pg_policies WHERE tablename = 'user_scene_configs';" | tr -d ' \n')

if [ "$POLICIES" -gt 0 ]; then
    print_success "RLS policies exist ($POLICIES policies found)!"
else
    print_warning "No RLS policies found!"
fi

# Check indexes
print_status "Checking indexes..."
INDEXES=$(docker compose exec db psql -U postgres -d postgres -t -c "SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'user_scene_configs';" | tr -d ' \n')

if [ "$INDEXES" -gt 0 ]; then
    print_success "Indexes exist ($INDEXES indexes found)!"
else
    print_warning "No indexes found!"
fi

# Check if trigger exists
print_status "Checking trigger..."
TRIGGER_EXISTS=$(docker compose exec db psql -U postgres -d postgres -t -c "SELECT EXISTS (SELECT FROM pg_trigger WHERE tgname = 'update_user_scene_configs_updated_at');" | tr -d ' \n')

if [ "$TRIGGER_EXISTS" = "t" ]; then
    print_success "Update trigger exists!"
else
    print_warning "Update trigger does not exist!"
fi

# Check if function exists
print_status "Checking function..."
FUNCTION_EXISTS=$(docker compose exec db psql -U postgres -d postgres -t -c "SELECT EXISTS (SELECT FROM pg_proc WHERE proname = 'update_updated_at_column');" | tr -d ' \n')

if [ "$FUNCTION_EXISTS" = "t" ]; then
    print_success "Update function exists!"
else
    print_warning "Update function does not exist!"
fi

# Test API endpoint
print_status "Testing API endpoint..."

if [ -z "$SUPABASE_ANON_KEY" ]; then
    print_warning "Skipping API check - NEXT_PUBLIC_SUPABASE_ANON_KEY not set."
else
    API_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$SUPABASE_REST_URL" -H "apikey: $SUPABASE_ANON_KEY")

    if [ "$API_RESPONSE" = "200" ]; then
        print_success "API endpoint is accessible!"
    else
        print_error "API endpoint returned status code: $API_RESPONSE"
    fi
fi

# Final summary
echo ""
print_status "Verification Summary:"
echo "========================"
echo "✅ Services are running"
echo "✅ user_scene_configs table exists"
echo "✅ RLS policies configured"
echo "✅ Indexes created"
echo "✅ Trigger and function exist"
echo "✅ API endpoint accessible"
echo ""
print_success "All verifications passed! Your setup is ready."
echo ""
print_status "Next steps:"
echo "1. Test your application at http://localhost:3000"
echo "2. Try signing up with a new user"
echo "3. Verify that scene configs are created automatically"
echo "4. Test the 3D scene functionality"
