#!/bin/bash

# Add RLS policies to allow admins to access all data

echo "🔐 Adding admin RLS policies to database..."

# Check if Docker is running
if ! docker ps | grep -q supabase-db; then
  echo "❌ Error: Supabase database container is not running"
  echo "Start it with: docker-compose up -d"
  exit 1
fi

# Apply the migration
docker exec -i microcement-supabase-db-1 psql -U postgres -d postgres < /Users/ivanprokic/workspace/www/microcement/supabase/migrations/add_admin_rls_policies.sql

if [ $? -eq 0 ]; then
  echo "✅ Admin RLS policies added successfully!"
  echo "🔓 Admins can now access all data in the system"
else
  echo "❌ Failed to add admin RLS policies"
  exit 1
fi
