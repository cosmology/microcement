#!/bin/bash

# Migration Management Script
# Helps you transition from Supabase migrations to Liquibase

set -e

echo "🔄 Migration Management Tool"
echo "============================"
echo ""

# Function to check if we're in the right directory
check_directory() {
    if [ ! -f "docker-compose.yml" ] || [ ! -d "supabase" ]; then
        echo "❌ Please run this script from the project root directory"
        exit 1
    fi
}

# Function to show current migration status
show_status() {
    echo "📊 Current Migration Status:"
    echo ""
    
    echo "Supabase Migrations:"
    if [ -d "supabase/migrations" ]; then
        echo "  📁 Found $(ls supabase/migrations/*.sql 2>/dev/null | wc -l) migration files"
        ls -la supabase/migrations/*.sql 2>/dev/null | sed 's/^/    /'
    else
        echo "  📁 No migrations directory found"
    fi
    
    echo ""
    echo "Liquibase Migrations:"
    if [ -d "supabase/liquibase" ]; then
        echo "  📁 Found $(ls supabase/liquibase/*.yaml 2>/dev/null | wc -l) changelog files"
        ls -la supabase/liquibase/*.yaml 2>/dev/null | sed 's/^/    /'
    else
        echo "  📁 No liquibase directory found"
    fi
    
    echo ""
}

# Function to backup current database
backup_database() {
    echo "💾 Creating database backup..."
    
    # Check if Supabase is running
    if ! docker compose -f supabase/docker-compose.yml ps db | grep -q "Up"; then
        echo "❌ Supabase database is not running. Please start it first:"
        echo "   cd supabase && docker compose up -d"
        exit 1
    fi
    
    # Create backup
    BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
    echo "  📦 Creating backup: $BACKUP_FILE"
    
    docker compose -f supabase/docker-compose.yml exec -T db pg_dump -U postgres postgres > "$BACKUP_FILE"
    
    if [ $? -eq 0 ]; then
        echo "  ✅ Backup created successfully: $BACKUP_FILE"
    else
        echo "  ❌ Backup failed"
        exit 1
    fi
}

# Function to run the migration
run_migration() {
    echo "🚀 Running migration to Liquibase structure..."
    
    # Check if migration file exists
    if [ ! -f "supabase/migrations/20250120000003_migrate_to_liquibase_structure.sql" ]; then
        echo "❌ Migration file not found. Please ensure the migration script exists."
        exit 1
    fi
    
    # Run the migration
    echo "  📝 Executing migration script..."
    docker compose -f supabase/docker-compose.yml exec -T db psql -U postgres postgres < supabase/migrations/20250120000003_migrate_to_liquibase_structure.sql
    
    if [ $? -eq 0 ]; then
        echo "  ✅ Migration completed successfully"
    else
        echo "  ❌ Migration failed"
        exit 1
    fi
}

# Function to verify migration
verify_migration() {
    echo "🔍 Verifying migration..."
    
    # Check if new tables exist
    docker compose -f supabase/docker-compose.yml exec -T db psql -U postgres postgres -c "
        SELECT 
            'scene_design_configs' as table_name, 
            COUNT(*) as record_count 
        FROM public.scene_design_configs
        UNION ALL
        SELECT 
            'scene_follow_paths' as table_name, 
            COUNT(*) as record_count 
        FROM public.scene_follow_paths;
    "
    
    echo ""
    echo "✅ Migration verification complete"
}

# Function to clean up old migrations
cleanup_old_migrations() {
    echo "🧹 Cleaning up old Supabase migrations..."
    
    read -p "⚠️  This will remove old migration files. Continue? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Move old migrations to backup
        mkdir -p "migration_backup_$(date +%Y%m%d_%H%M%S)"
        mv supabase/migrations/20250120000001_create_user_scene_configs.sql "migration_backup_$(date +%Y%m%d_%H%M%S)/" 2>/dev/null || true
        mv supabase/migrations/20250120000002_create_user_scene_configs_schema.sql "migration_backup_$(date +%Y%m%d_%H%M%S)/" 2>/dev/null || true
        
        echo "  ✅ Old migrations moved to backup directory"
        echo "  📝 Keep the migration script (20250120000003) for reference"
    else
        echo "  ⏭️  Skipping cleanup"
    fi
}

# Main menu
show_menu() {
    echo ""
    echo "🎯 Available Actions:"
    echo "  1) Show current migration status"
    echo "  2) Create database backup"
    echo "  3) Run migration to Liquibase structure"
    echo "  4) Verify migration"
    echo "  5) Clean up old migrations"
    echo "  6) Full migration process (backup + migrate + verify)"
    echo "  7) Exit"
    echo ""
}

# Main execution
main() {
    check_directory
    
    while true; do
        show_menu
        read -p "Select an option (1-7): " choice
        
        case $choice in
            1)
                show_status
                ;;
            2)
                backup_database
                ;;
            3)
                run_migration
                ;;
            4)
                verify_migration
                ;;
            5)
                cleanup_old_migrations
                ;;
            6)
                echo "🚀 Running full migration process..."
                backup_database
                run_migration
                verify_migration
                cleanup_old_migrations
                echo "🎉 Full migration process completed!"
                ;;
            7)
                echo "👋 Goodbye!"
                exit 0
                ;;
            *)
                echo "❌ Invalid option. Please select 1-7."
                ;;
        esac
        
        echo ""
        read -p "Press Enter to continue..."
        clear
    done
}

# Run main function
main
