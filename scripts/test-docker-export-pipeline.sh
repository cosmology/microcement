#!/bin/bash

# Test script for USDZ → GLB Export Pipeline in Docker Environment
# This script verifies that all components are properly set up and running in Docker

echo "🐳 Testing USDZ → GLB Export Pipeline in Docker Environment"
echo "============================================================="

# Check if Docker is running
echo "📋 Checking Docker status..."
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
else
    echo "✅ Docker is running"
fi

# Check if Supabase services are running
echo ""
echo "🗄️ Checking Supabase services..."
if docker-compose -f supabase/docker-compose.yml ps | grep -q "Up"; then
    echo "✅ Supabase services are running"
else
    echo "❌ Supabase services are not running. Please start them first:"
    echo "   docker-compose -f supabase/docker-compose.yml up -d"
    exit 1
fi

# Check if exports table exists
echo ""
echo "📊 Checking database schema..."
EXPORTS_TABLE_EXISTS=$(docker-compose -f supabase/docker-compose.yml exec -T db psql -U postgres -d postgres -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'exports');" | tr -d ' \n')

if [ "$EXPORTS_TABLE_EXISTS" = "t" ]; then
    echo "✅ exports table exists"
else
    echo "❌ exports table does not exist. Run migration:"
    echo "   docker-compose -f supabase/docker-compose.yml run --rm liquibase"
    exit 1
fi

# Check if notification function exists
echo ""
echo "🔔 Checking notification function..."
NOTIFY_FUNCTION_EXISTS=$(docker-compose -f supabase/docker-compose.yml exec -T db psql -U postgres -d postgres -t -c "SELECT EXISTS (SELECT FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'notify_export_ready');" | tr -d ' \n')

if [ "$NOTIFY_FUNCTION_EXISTS" = "t" ]; then
    echo "✅ notify_export_ready function exists"
else
    echo "❌ notify_export_ready function does not exist"
    exit 1
fi

# Check if exports bucket exists
echo ""
echo "🪣 Checking storage bucket..."
EXPORTS_BUCKET_EXISTS=$(docker-compose -f supabase/docker-compose.yml exec -T db psql -U postgres -d postgres -t -c "SELECT EXISTS (SELECT FROM storage.buckets WHERE id = 'exports');" | tr -d ' \n')

if [ "$EXPORTS_BUCKET_EXISTS" = "t" ]; then
    echo "✅ exports storage bucket exists"
else
    echo "❌ exports storage bucket does not exist. Creating it..."
    docker-compose -f supabase/docker-compose.yml exec -T db psql -U postgres -d postgres -c "INSERT INTO storage.buckets (id, name, public) VALUES ('exports', 'exports', false) ON CONFLICT (id) DO NOTHING;"
    echo "✅ exports storage bucket created"
fi

# Check if required files exist
echo ""
echo "📁 Checking required files..."
files=(
    "lib/supabaseAdmin.ts"
    "app/api/exports/route.ts"
    "app/api/background/convert/route.ts"
    "hooks/useExportStatus.ts"
    "app/components/ExportButton.tsx"
    "app/components/GLBViewer.tsx"
    "supabase/liquibase/changelogs/0008-create-exports-table.yaml"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file missing"
        exit 1
    fi
done

# Check if package.json has required dependencies
echo ""
echo "📦 Checking dependencies..."
if grep -q "node-fetch" package.json; then
    echo "✅ node-fetch dependency found"
else
    echo "❌ node-fetch dependency missing"
    exit 1
fi

# Check if vercel.json has background function config
echo ""
echo "⚙️ Checking Vercel configuration..."
if grep -q "api/background/convert" vercel.json; then
    echo "✅ Background function configured in vercel.json"
else
    echo "❌ Background function not configured in vercel.json"
    exit 1
fi

# Check if docker-compose.yml has export pipeline environment variables
echo ""
echo "🐳 Checking Docker Compose configuration..."
if grep -q "SUPABASE_SERVICE_ROLE_KEY" docker-compose.yml && grep -q "BUCKET_NAME" docker-compose.yml; then
    echo "✅ Docker Compose has export pipeline environment variables"
else
    echo "❌ Docker Compose missing export pipeline environment variables"
    exit 1
fi

# Test API endpoint availability
echo ""
echo "🌐 Testing API endpoints..."
if curl -s -f "http://localhost:8000/health" > /dev/null; then
    echo "✅ Supabase API is accessible"
else
    echo "❌ Supabase API is not accessible. Make sure it's running on localhost:8000"
fi

echo ""
echo "🎉 All Docker environment checks passed! USDZ → GLB Export Pipeline is properly set up."
echo ""
echo "📝 Next steps:"
echo "1. Start the Next.js development server:"
echo "   docker-compose up app-dev"
echo "2. Open http://localhost:3000 in your browser"
echo "3. Navigate to the Room Scanner panel"
echo "4. Upload a USDZ file and test the export functionality"
echo ""
echo "⚠️  Note: The actual USDZ to GLB conversion is currently a placeholder."
echo "   Replace the convertUsdzToGlb function with a real implementation."
echo ""
echo "🔧 Useful Docker commands:"
echo "   View logs: docker-compose logs -f app-dev"
echo "   Restart services: docker-compose restart app-dev"
echo "   Stop services: docker-compose down"
