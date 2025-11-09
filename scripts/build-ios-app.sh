#!/usr/bin/env bash
set -euo pipefail

echo "🔨 Building iOS Room Plan Scanner App"
echo "====================================="

# Navigate to Xcode project directory
cd /Users/ivanprokic/workspace/xcode/room-plan-demo

echo "📁 Project directory: $(pwd)"

# Check if Xcode project exists
if [ ! -f "RoomPlanExampleApp.xcodeproj/project.pbxproj" ]; then
    echo "❌ Xcode project not found at $(pwd)"
    exit 1
fi

echo "✅ Xcode project found"

# Open Xcode project
echo "🚀 Opening Xcode project..."
open RoomPlanExampleApp.xcodeproj

echo ""
echo "📱 Next steps in Xcode:"
echo "1. Update Main.storyboard to add 'Export to Web' button"
echo "2. Connect outlets and actions as described in docs/iOS-STORYBOARD-UPDATE-STEPS.md"
echo "3. Select your iPad as target device"
echo "4. Build and run (Cmd+B then Cmd+R)"
echo ""
echo "🔍 After building, you should see two buttons:"
echo "   - 'Save Locally' (original functionality)"
echo "   - 'Export to Web' (new functionality)"
echo ""
echo "📋 Storyboard update guide: docs/iOS-STORYBOARD-UPDATE-STEPS.md"
