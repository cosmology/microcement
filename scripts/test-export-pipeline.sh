#!/bin/bash

# Test script for USDZ → GLB Export Pipeline
# This script verifies that all components are properly set up

echo "🧪 Testing USDZ → GLB Export Pipeline Setup"
echo "============================================"

# Check if required environment variables are set
echo "📋 Checking environment variables..."

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo "❌ NEXT_PUBLIC_SUPABASE_URL not set"
    exit 1
else
    echo "✅ NEXT_PUBLIC_SUPABASE_URL is set"
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ SUPABASE_SERVICE_ROLE_KEY not set"
    exit 1
else
    echo "✅ SUPABASE_SERVICE_ROLE_KEY is set"
fi

if [ -z "$BUCKET_NAME" ]; then
    echo "❌ BUCKET_NAME not set"
    exit 1
else
    echo "✅ BUCKET_NAME is set to: $BUCKET_NAME"
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

# Check if database migration is included
echo ""
echo "🗄️ Checking database migration..."

if grep -q "0008-create-exports-table.yaml" supabase/liquibase/changelog-master.xml; then
    echo "✅ Database migration is included in master changelog"
else
    echo "❌ Database migration not included in master changelog"
    exit 1
fi

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

if grep -q "api/background/convert.ts" vercel.json; then
    echo "✅ Background function configured in vercel.json"
else
    echo "❌ Background function not configured in vercel.json"
    exit 1
fi

echo ""
echo "🎉 All checks passed! USDZ → GLB Export Pipeline is properly set up."
echo ""
echo "📝 Next steps:"
echo "1. Run database migration: docker-compose exec supabase-db liquibase update"
echo "2. Install dependencies: pnpm install"
echo "3. Start development server: pnpm dev"
echo "4. Test the pipeline by uploading a USDZ file in the Room Scanner"
echo ""
echo "⚠️  Note: The actual USDZ to GLB conversion is currently a placeholder."
echo "   Replace the convertUsdzToGlb function with a real implementation."
