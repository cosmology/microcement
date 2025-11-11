#!/bin/bash

# Docker-based Vercel Deployment Script
# This script deploys your app to Vercel using Docker

echo "🐳 Docker-based Vercel Deployment"
echo "================================"
echo ""

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if user is logged in to Vercel
echo "🔐 Checking Vercel login status..."
if ! docker run --rm -it \
  -v "$(pwd):/app" \
  -w /app \
  -v ~/.vercel:/root/.vercel \
  node:20-alpine \
  sh -c "npm install -g vercel && vercel whoami" &> /dev/null; then
    echo "🔐 Please log in to Vercel first:"
    docker run --rm -it \
      -v "$(pwd):/app" \
      -w /app \
      -v ~/.vercel:/root/.vercel \
      node:20-alpine \
      sh -c "npm install -g vercel && vercel login"
fi

echo ""
echo "📋 Environment Variables Check:"
echo ""

# List current environment variables
docker run --rm -it \
  -v "$(pwd):/app" \
  -w /app \
  -v ~/.vercel:/root/.vercel \
  node:20-alpine \
  sh -c "npm install -g vercel && vercel env ls"

echo ""
read -p "Are all required environment variables set? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Please set up environment variables first using:"
    echo "   ./scripts/setup-vercel-env-docker.sh"
    echo "   Or use the Vercel Dashboard"
    exit 1
fi

echo ""
echo "🚀 Deploying to Vercel..."

# Deploy to production
docker run --rm -it \
  -v "$(pwd):/app" \
  -w /app \
  -v ~/.vercel:/root/.vercel \
  node:20-alpine \
  sh -c "npm install -g vercel && vercel --prod"

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📝 Next Steps:"
echo "1. Check the deployment logs above"
echo "2. Test the authentication flow"
echo "3. Verify Supabase redirect URLs are configured"
echo ""
echo "🔗 Vercel Dashboard: https://vercel.com/dashboard"
echo "🔗 Supabase Dashboard: https://supabase.com/dashboard"
