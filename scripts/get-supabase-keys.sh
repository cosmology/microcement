#!/bin/bash

# Script to extract Supabase API keys from running containers
# This helps fix JWT signature errors by getting the correct keys

echo "🔑 Extracting Supabase API Keys from running containers..."
echo ""

SUPABASE_DIR="$(cd "$(dirname "$0")/../supabase" && pwd)"

if [ ! -d "$SUPABASE_DIR" ]; then
  echo "❌ Error: supabase/ directory not found"
  exit 1
fi

cd "$SUPABASE_DIR"

# Check if containers are running
if ! docker compose ps | grep -q "supabase-kong.*Up"; then
  echo "❌ Error: Supabase containers are not running"
  echo "   Please start Supabase first: cd supabase && docker compose up -d"
  exit 1
fi

echo "📋 Checking Kong container for keys..."
echo ""

# Try to get keys from Kong environment
ANON_KEY=$(docker compose exec -T kong env 2>/dev/null | grep "SUPABASE_ANON_KEY=" | cut -d'=' -f2- | tr -d '\r\n')
SERVICE_KEY=$(docker compose exec -T kong env 2>/dev/null | grep "SUPABASE_SERVICE_KEY=" | cut -d'=' -f2- | tr -d '\r\n')

if [ -z "$ANON_KEY" ] || [ -z "$SERVICE_KEY" ]; then
  echo "⚠️  Could not extract keys from Kong container"
  echo ""
  echo "📝 Alternative: Get keys from Supabase Studio"
  echo "   1. Open: http://localhost:8000"
  echo "   2. Login with credentials"
  echo "   3. Go to: Settings → API"
  echo "   4. Copy the keys from there"
  echo ""
  exit 1
fi

echo "✅ Found keys:"
echo ""
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY"
echo ""
echo "SERVICE_ROLE_KEY=$SERVICE_KEY"
echo "SUPABASE_SERVICE_ROLE_KEY=$SERVICE_KEY"
echo ""

# Ask if user wants to update .env
read -p "📝 Do you want to update your root .env file with these keys? (y/n) " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
  ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
  ENV_FILE="$ROOT_DIR/.env"
  
  if [ ! -f "$ENV_FILE" ]; then
    echo "⚠️  .env file not found, creating from env.example..."
    cp "$ROOT_DIR/env.example" "$ENV_FILE"
  fi
  
  # Update or add the keys
  if grep -q "^NEXT_PUBLIC_SUPABASE_ANON_KEY=" "$ENV_FILE"; then
    sed -i.bak "s|^NEXT_PUBLIC_SUPABASE_ANON_KEY=.*|NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY|" "$ENV_FILE"
    echo "✓ Updated NEXT_PUBLIC_SUPABASE_ANON_KEY"
  else
    echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY" >> "$ENV_FILE"
    echo "✓ Added NEXT_PUBLIC_SUPABASE_ANON_KEY"
  fi
  
  if grep -q "^SERVICE_ROLE_KEY=" "$ENV_FILE"; then
    sed -i.bak "s|^SERVICE_ROLE_KEY=.*|SERVICE_ROLE_KEY=$SERVICE_KEY|" "$ENV_FILE"
    echo "✓ Updated SERVICE_ROLE_KEY"
  else
    echo "SERVICE_ROLE_KEY=$SERVICE_KEY" >> "$ENV_FILE"
    echo "✓ Added SERVICE_ROLE_KEY"
  fi
  
  if grep -q "^SUPABASE_SERVICE_ROLE_KEY=" "$ENV_FILE"; then
    sed -i.bak "s|^SUPABASE_SERVICE_ROLE_KEY=.*|SUPABASE_SERVICE_ROLE_KEY=$SERVICE_KEY|" "$ENV_FILE"
    echo "✓ Updated SUPABASE_SERVICE_ROLE_KEY"
  else
    echo "SUPABASE_SERVICE_ROLE_KEY=$SERVICE_KEY" >> "$ENV_FILE"
    echo "✓ Added SUPABASE_SERVICE_ROLE_KEY"
  fi
  
  rm -f "$ENV_FILE.bak"
  
  echo ""
  echo "✅ .env file updated successfully!"
  echo ""
  echo "🔄 Please restart your app container:"
  echo "   docker compose restart app-dev"
else
  echo ""
  echo "📋 Keys displayed above. Please update your .env file manually."
fi
