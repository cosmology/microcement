#!/usr/bin/env bash
set -euo pipefail

# Script to restart the app container with updated Supabase URL for external device access
# This fixes the issue where iPad/other devices can't authenticate because they're trying to access localhost:8000

echo "🔄 Restarting app container with updated Supabase URL for external access..."

# Restart the app container to pick up the new NEXT_PUBLIC_SUPABASE_URL=192.168.1.9:8000
docker-compose --profile dev restart app-dev

echo "✅ App container restarted!"
echo ""
echo "📱 Now your iPad should be able to authenticate properly when accessing:"
echo "   http://192.168.1.9:3000"
echo ""
echo "🔍 The Supabase URL is now configured as:"
echo "   http://192.168.1.9:8000"
echo ""
echo "💡 If you're still having issues, make sure:"
echo "   1. Your Mac's IP address is still 192.168.1.9"
echo "   2. The Supabase services are running on port 8000"
echo "   3. Your firewall allows connections on ports 3000 and 8000"
