#!/bin/bash

# Vercel Build-Time Migration Script
# This script runs migrations during Vercel deployment

set -e

echo "🚀 Starting Vercel build-time migration..."

# Check if we're in production
if [ "$VERCEL_ENV" = "production" ]; then
    echo "📦 Production deployment detected"
    
    # Wait for Vercel to be ready
    sleep 10
    
    # Get the deployment URL
    DEPLOYMENT_URL="https://$VERCEL_URL"
    echo "🔗 Deployment URL: $DEPLOYMENT_URL"
    
    # Run migration via API
    echo "🔄 Running database migration..."
    curl -X POST "$DEPLOYMENT_URL/api/migrate" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $VERCEL_TOKEN" \
        --max-time 60 \
        --retry 3 \
        --retry-delay 5
    
    echo "✅ Migration completed"
else
    echo "🔧 Development/preview deployment - skipping migration"
fi

echo "🎉 Build process complete"
