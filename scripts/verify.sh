#!/bin/bash

echo "🔍 Running local verification checks..."

# Check if container is running
if ! docker ps | grep -q microcement-app-dev-1; then
    echo "❌ Container not running. Starting it..."
    docker-compose --profile dev up -d
    sleep 5
fi

echo "📝 Running TypeScript type check..."
docker exec -it microcement-app-dev-1 sh -c "pnpm typecheck"
if [ $? -ne 0 ]; then
    echo "❌ TypeScript errors found!"
    exit 1
fi

echo "🔍 Running linting..."
docker exec -it microcement-app-dev-1 sh -c "pnpm lint"
if [ $? -ne 0 ]; then
    echo "❌ Linting errors found!"
    exit 1
fi

echo "🏗️ Running build test..."
docker exec -it microcement-app-dev-1 sh -c "pnpm build"
if [ $? -ne 0 ]; then
    echo "❌ Build errors found!"
    exit 1
fi

echo "✅ All checks passed! Ready to push." 