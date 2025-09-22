#!/bin/bash

# Production Migration Script for Supabase
# This script helps manage production database migrations

set -e

echo "🚀 Supabase Production Migration Helper"
echo "======================================"

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Installing..."
    npm install -g supabase
fi

# Check if user is logged in
if ! supabase projects list &> /dev/null; then
    echo "🔐 Please login to Supabase first:"
    supabase login
fi

echo "📋 Available projects:"
supabase projects list

echo ""
echo "🔗 Linking to your project..."
echo "Project Reference: lxsbolsjavowlymvpyxo"
supabase link --project-ref lxsbolsjavowlymvpyxo

echo ""
echo "📊 Current database status:"
supabase db diff

echo ""
echo "🚀 Available migration commands:"
echo "1. supabase db push          - Push local migrations to production"
echo "2. supabase db pull          - Pull production schema to local"
echo "3. supabase db reset         - Reset local database"
echo "4. supabase db diff          - Show differences between local and production"

echo ""
echo "⚠️  IMPORTANT: Always test migrations locally first!"
echo "   Run: supabase db reset"
echo "   Then: supabase db push"

echo ""
echo "🔧 To run the user_scene_configs migration:"
echo "1. Copy the SQL from supabase/production-migration.sql"
echo "2. Go to Supabase Dashboard > SQL Editor"
echo "3. Paste and run the SQL"
echo "4. Or use: supabase db push (if you have migrations set up)"

echo ""
echo "✅ Migration helper complete!"
