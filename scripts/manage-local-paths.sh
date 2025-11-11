#!/bin/bash

# Local Follow Paths Management Script
# This script helps manage the LOCAL_FOLLOW_PATHS environment variable

ENV_FILE=".env"

# Function to show current status
show_status() {
    if grep -q "NEXT_PUBLIC_LOCAL_FOLLOW_PATHS=true" "$ENV_FILE" 2>/dev/null; then
        echo "🏠 Local Follow Paths: ENABLED"
        echo "   Using local follow paths data from lib/config/localFollowPaths.ts"
    elif grep -q "NEXT_PUBLIC_LOCAL_FOLLOW_PATHS=false" "$ENV_FILE" 2>/dev/null; then
        echo "🗄️  Local Follow Paths: DISABLED"
        echo "   Using database follow paths data"
    else
        echo "❓ Local Follow Paths: NOT SET"
        echo "   Default behavior (using database data)"
    fi
}

# Function to enable local follow paths
enable_local() {
    if [ ! -f "$ENV_FILE" ]; then
        echo "Creating $ENV_FILE..."
        touch "$ENV_FILE"
    fi
    
    # Remove existing setting if it exists
    sed -i.bak '/NEXT_PUBLIC_LOCAL_FOLLOW_PATHS/d' "$ENV_FILE" 2>/dev/null
    
    # Add the setting
    echo "NEXT_PUBLIC_LOCAL_FOLLOW_PATHS=true" >> "$ENV_FILE"
    
    echo "✅ Local Follow Paths ENABLED"
    echo "   Restart your development server to apply changes"
    echo ""
    echo "📝 You can now edit follow paths in: lib/config/localFollowPaths.ts"
    echo "   - Bathroom Tour: Reshuffle points around bath area"
    echo "   - Kitchen Tour: Reshuffle points around kitchen area" 
    echo "   - Living Room Tour: Reshuffle points around living room area"
}

# Function to disable local follow paths
disable_local() {
    if [ ! -f "$ENV_FILE" ]; then
        echo "Creating $ENV_FILE..."
        touch "$ENV_FILE"
    fi
    
    # Remove existing setting if it exists
    sed -i.bak '/NEXT_PUBLIC_LOCAL_FOLLOW_PATHS/d' "$ENV_FILE" 2>/dev/null
    
    # Add the setting
    echo "NEXT_PUBLIC_LOCAL_FOLLOW_PATHS=false" >> "$ENV_FILE"
    
    echo "✅ Local Follow Paths DISABLED"
    echo "   Restart your development server to apply changes"
    echo ""
    echo "🗄️  Now using database follow paths data"
}

# Function to show help
show_help() {
    echo "Local Follow Paths Management Script"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  enable   - Enable local follow paths (use local data)"
    echo "  disable  - Disable local follow paths (use database data)"
    echo "  status   - Show current status"
    echo "  help     - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 enable   # Enable local follow paths"
    echo "  $0 disable  # Disable local follow paths"
    echo "  $0 status   # Check current status"
}

# Main script logic
case "${1:-status}" in
    "enable")
        enable_local
        ;;
    "disable")
        disable_local
        ;;
    "status")
        show_status
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    *)
        echo "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
