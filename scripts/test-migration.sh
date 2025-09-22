#!/bin/bash

# Test Migration Script
# This script tests the migration system locally

echo "🧪 Testing Migration System"
echo "============================"

# Check if app is running
if ! curl -s http://localhost:3000 > /dev/null; then
    echo "❌ App not running. Start with: docker compose --profile dev up"
    exit 1
fi

echo "✅ App is running"

# Test migration API
echo "🔄 Testing migration API..."
RESPONSE=$(curl -s -X POST http://localhost:3000/api/migrate)

echo "📋 Migration Response:"
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"

# Check if migration was successful
if echo "$RESPONSE" | grep -q "success.*true"; then
    echo "✅ Migration test passed!"
else
    echo "❌ Migration test failed!"
    exit 1
fi

echo ""
echo "🎉 Migration system is working correctly!"
echo "Ready for production deployment!"
