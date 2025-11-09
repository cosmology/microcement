#!/usr/bin/env bash
set -euo pipefail

# Script to set up development environment:
# - Detects and updates IP address in .env
# - Updates Supabase URLs for external access
# - Restarts containers to apply changes

echo "🔍 Detecting your current IP address..."

# Try to get IP from the system
NEW_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "")

if [ -z "$NEW_IP" ]; then
  echo "❌ Could not automatically detect IP address"
  read -p "Please enter your IP address: " NEW_IP
fi

echo "📍 Detected IP: $NEW_IP"

# Update .env file
if [ -f .env ]; then
  # Backup existing .env
  cp .env .env.backup
  
  # Update NEXT_PUBLIC_SUPABASE_URL with proper protocol
  sed -i '' -E "s|^NEXT_PUBLIC_SUPABASE_URL=.*$|NEXT_PUBLIC_SUPABASE_URL=http://$NEW_IP:8000|g" .env
  
  # Update NEXT_PUBLIC_SUPABASE_URL_EXTERNAL
  sed -i '' -E "s|^NEXT_PUBLIC_SUPABASE_URL_EXTERNAL=.*$|NEXT_PUBLIC_SUPABASE_URL_EXTERNAL=http://$NEW_IP:8000|g" .env
  
  echo "✅ Updated .env with IP: http://$NEW_IP:8000"
else
  echo "❌ .env file not found"
  exit 1
fi

# Restart containers to pick up new env
echo ""
echo "🔄 Restarting containers..."
echo "─────────────────────────────────────────────────────────"
cd "$(dirname "$0")/.."

# Stop containers
echo "   Stopping existing containers..."
if ! bash scripts/dev-stop.sh; then
  echo ""
  echo "❌ Failed to stop containers. Check output above for errors."
  exit 1
fi

echo "✅ Containers stopped successfully"

# Start containers (show output but make it clearer)
echo ""
echo "🚀 Starting containers (this may take a moment)..."
echo "   Note: 'CACHED' messages are normal - Docker is using cached layers"
echo "─────────────────────────────────────────────────────────"

# Run dev-start.sh and capture exit code
if bash scripts/dev-start.sh; then
  # Success
  echo ""
  echo "════════════════════════════════════════════════════════════"
  echo "✅ SETUP COMPLETE - All services are running!"
  echo "════════════════════════════════════════════════════════════"
  echo ""
  echo "📱 Access your app at: http://$NEW_IP:3000"
  echo "🔗 Supabase URL: http://$NEW_IP:8000"
  echo ""
  echo "💡 Remember to update your iOS app's AppConfig with this IP address"
  echo ""
  exit 0
else
  # Failure
  EXIT_CODE=$?
  echo ""
  echo "════════════════════════════════════════════════════════════"
  echo "❌ SETUP FAILED (exit code: $EXIT_CODE)"
  echo "════════════════════════════════════════════════════════════"
  echo "Check the output above for errors."
  exit $EXIT_CODE
fi

