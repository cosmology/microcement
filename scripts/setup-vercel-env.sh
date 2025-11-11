#!/bin/bash

# Vercel Environment Variables Setup Script
# This script helps you set up environment variables for Vercel deployment

echo "🚀 Vercel Environment Variables Setup"
echo "======================================"
echo ""

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

# Add environment variables
echo "Adding NEXT_PUBLIC_SUPABASE_URL..."
vercel env add NEXT_PUBLIC_SUPABASE_URL production <<< "$SUPABASE_URL"
vercel env add NEXT_PUBLIC_SUPABASE_URL preview <<< "$SUPABASE_URL"

echo "Adding NEXT_PUBLIC_SUPABASE_ANON_KEY..."
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production <<< "$SUPABASE_ANON_KEY"
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY preview <<< "$SUPABASE_ANON_KEY"

echo "Adding NEXT_PUBLIC_SITE_URL..."
vercel env add NEXT_PUBLIC_SITE_URL production <<< "$SITE_URL"
vercel env add NEXT_PUBLIC_SITE_URL preview <<< "$SITE_URL"

echo "Adding NEXT_PUBLIC_APP_NAME..."
vercel env add NEXT_PUBLIC_APP_NAME production <<< "Microcement Studio"
vercel env add NEXT_PUBLIC_APP_NAME preview <<< "Microcement Studio"

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
echo "3. Deploy your app:"
echo "   vercel --prod"
echo ""
echo "4. Test the authentication flow"
echo ""
echo "🔗 Supabase Dashboard: https://supabase.com/dashboard"
echo "🔗 Vercel Dashboard: https://vercel.com/dashboard"
