#!/bin/bash

# Add scene_design_config_id foreign key to architect_clients table

echo "🔄 Adding scene_design_config_id column to architect_clients table..."

# Check if Docker is running
if ! docker ps | grep -q supabase-db; then
  echo "❌ Error: Supabase database container is not running"
  echo "Start it with: docker-compose up -d"
  exit 1
fi

# Apply the migration
docker exec -i microcement-supabase-db-1 psql -U postgres -d postgres < /Users/ivanprokic/workspace/www/microcement/supabase/migrations/add_scene_design_config_fk.sql

if [ $? -eq 0 ]; then
  echo "✅ Foreign key added successfully!"
  echo "📊 architect_clients now has scene_design_config_id column"
  echo "🔗 Proper relationship tracking enabled"
else
  echo "❌ Failed to add foreign key"
  exit 1
fi
