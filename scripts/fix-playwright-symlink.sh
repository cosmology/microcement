#!/bin/bash
# Script to fix libudev.so.1 symlink in running container
# This ensures the symlink exists even if it was lost during container restart

set -e

echo "🔧 Fixing Playwright library symlinks..."

# Create symlink if it doesn't exist
if [ ! -f /usr/lib/libudev.so.1 ]; then
  if [ -f /usr/lib/libudev.so.0 ]; then
    ln -sf /usr/lib/libudev.so.0 /usr/lib/libudev.so.1
    echo "✅ Created /usr/lib/libudev.so.1 symlink"
  else
    echo "⚠️  /usr/lib/libudev.so.0 not found, cannot create symlink"
    exit 1
  fi
else
  echo "✅ /usr/lib/libudev.so.1 already exists"
fi

# Verify symlink
if [ -L /usr/lib/libudev.so.1 ]; then
  echo "✅ Symlink verified: $(readlink /usr/lib/libudev.so.1)"
else
  echo "❌ Symlink verification failed"
  exit 1
fi

echo "✅ Playwright library fix complete!"

