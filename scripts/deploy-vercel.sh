#!/bin/bash

# Vercel Deployment Script for Microcement Studio
# This script helps deploy your app to Vercel with proper environment variables

echo "🚀 Starting Vercel Deployment for Microcement Studio..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Check if user is logged in to Vercel
if ! vercel whoami &> /dev/null; then
    echo "🔐 Please log in to Vercel first:"
    vercel login
fi

echo "📋 Environment Variables Setup:"
echo ""
echo "Please ensure you have set these environment variables in your Vercel dashboard:"
echo ""
echo "Required Variables:"
echo "  NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co"
echo "  NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key"
echo "  NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app"
echo "  NEXT_PUBLIC_APP_NAME=Microcement Studio"
echo ""
echo "Optional Variables (for self-hosted Supabase):"
echo "  SMTP_HOST=smtp.gmail.com"
echo "  SMTP_PORT=587"
echo "  SMTP_USER=your-email@gmail.com"
echo "  SMTP_PASS=your-app-password"
echo "  SMTP_ADMIN_EMAIL=your-email@gmail.com"
echo "  SMTP_SENDER_NAME=Microcement Studio"
echo ""

read -p "Have you set up the environment variables? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Please set up environment variables first. Exiting..."
    exit 1
fi

echo "🔧 Building and deploying to Vercel..."

# Deploy to production
vercel --prod

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📝 Next Steps:"
echo "1. Go to your Vercel dashboard"
echo "2. Check the deployment logs for any errors"
echo "3. Test the authentication flow"
echo "4. Configure Supabase redirect URLs:"
echo "   - Add: https://your-app.vercel.app/auth/callback"
echo "   - Add: https://your-app.vercel.app/login"
echo ""
echo "🔗 Supabase Dashboard: https://supabase.com/dashboard"
echo "🔗 Vercel Dashboard: https://vercel.com/dashboard"
