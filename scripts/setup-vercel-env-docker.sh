#!/bin/bash

# Docker-based Vercel Environment Variables Setup
# This script runs Vercel CLI inside a Docker container

echo "🐳 Docker-based Vercel Environment Variables Setup"
echo "=================================================="
echo ""

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

echo "📋 Setting up environment variables..."
echo ""

# Get Supabase URL
read -p "Enter your Supabase Project URL (e.g., https://your-project.supabase.co): " SUPABASE_URL

# Get Supabase Anon Key
read -p "Enter your Supabase Anon Key: " SUPABASE_ANON_KEY

# Get Vercel App URL
read -p "Enter your Vercel App URL (e.g., https://your-app.vercel.app): " SITE_URL

echo ""
echo "🔧 Adding environment variables to Vercel..."

# Run Vercel CLI in Docker container
docker run --rm -it \
  -v "$(pwd):/app" \
  -w /app \
  node:18-alpine \
  sh -c "
    npm install -g vercel &&
    vercel env add NEXT_PUBLIC_SUPABASE_URL production <<< '$SUPABASE_URL' &&
    vercel env add NEXT_PUBLIC_SUPABASE_URL preview <<< '$SUPABASE_URL' &&
    vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production <<< '$SUPABASE_ANON_KEY' &&
    vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY preview <<< '$SUPABASE_ANON_KEY' &&
    vercel env add NEXT_PUBLIC_SITE_URL production <<< '$SITE_URL' &&
    vercel env add NEXT_PUBLIC_SITE_URL preview <<< '$SITE_URL' &&
    vercel env add NEXT_PUBLIC_APP_NAME production <<< 'Microcement Studio' &&
    vercel env add NEXT_PUBLIC_APP_NAME preview <<< 'Microcement Studio'
  "

echo ""
echo "✅ Environment variables added successfully!"
echo ""
echo "📝 Next steps:"
echo "1. Go to your Supabase dashboard"
echo "2. Add these redirect URLs:"
echo "   - $SITE_URL/auth/callback"
echo "   - $SITE_URL/login"
echo "   - http://localhost:3000/auth/callback"
echo ""
echo "3. Push your code to GitHub to trigger deployment"
echo ""
echo "4. Test the authentication flow"
echo ""
echo "🔗 Supabase Dashboard: https://supabase.com/dashboard"
echo "🔗 Vercel Dashboard: https://vercel.com/dashboard"
