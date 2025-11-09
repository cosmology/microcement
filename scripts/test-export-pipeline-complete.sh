#!/usr/bin/env bash
set -euo pipefail

echo "🧪 Testing Complete USDZ → GLB Export Pipeline"
echo "=============================================="

# Test 1: Check if all required files exist
echo "📁 Checking required files..."
required_files=(
  "app/api/exports/route.ts"
  "app/api/background/convert/route.ts"
  "app/components/ExportButton.tsx"
  "hooks/useExportStatus.ts"
  "lib/supabaseAdmin.ts"
)

for file in "${required_files[@]}"; do
  if [ -f "$file" ]; then
    echo "✅ $file exists"
  else
    echo "❌ $file missing"
    exit 1
  fi
done

# Test 2: Check if database migration was applied
echo ""
echo "🗄️ Checking database schema..."
cd supabase
if docker-compose exec -T db psql -U postgres -d postgres -c "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'exports');" | grep -q "t"; then
  echo "✅ exports table exists"
else
  echo "❌ exports table missing - run database migration"
  exit 1
fi

# Test 3: Check if notification function exists
if docker-compose exec -T db psql -U postgres -d postgres -c "SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'notify_export_ready');" | grep -q "t"; then
  echo "✅ notify_export_ready function exists"
else
  echo "❌ notify_export_ready function missing - run database migration"
  exit 1
fi

cd ..

# Test 4: Check if storage bucket exists
echo ""
echo "🗄️ Checking storage bucket..."
if curl -s -f "http://192.168.1.9:8000/storage/v1/bucket/exports" -H "apikey: SUPABASE_ANON_KEY_PLACEHOLDER" > /dev/null; then
  echo "✅ exports storage bucket exists"
else
  echo "❌ exports storage bucket missing - create it manually"
fi

# Test 5: Check if app is running
echo ""
echo "🌐 Checking app status..."
if curl -s -f "http://192.168.1.9:3000" > /dev/null; then
  echo "✅ App is running on http://192.168.1.9:3000"
else
  echo "❌ App is not accessible"
fi

# Test 6: Check if Supabase is running
if curl -s -f "http://192.168.1.9:8000" > /dev/null; then
  echo "✅ Supabase is running on http://192.168.1.9:8000"
else
  echo "❌ Supabase is not accessible"
fi

echo ""
echo "🎉 Pipeline setup verification complete!"
echo ""
echo "📱 Next steps:"
echo "1. Open http://192.168.1.9:3000 on your iPad"
echo "2. Click 'Room Scanner' in the navigation"
echo "3. Click 'Open Room Plan Scanner' to scan a room"
echo "4. After scanning, upload the USDZ file"
echo "5. Click 'Export to GLB' to test the conversion pipeline"
echo "6. Click 'Save Locally' to download the USDZ file"
echo ""
echo "🔍 Monitor the conversion progress in real-time through the UI!"
