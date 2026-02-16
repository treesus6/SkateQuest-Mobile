#!/bin/bash

# SkateQuest - Complete Setup and Start Script
# This script will verify configuration and start the app

set -e  # Exit on error

echo ""
echo "========================================="
echo "  SkateQuest - Expo Go Setup & Start"
echo "========================================="
echo ""

# Check we're in the right directory
if [ ! -f "package.json" ]; then
    echo "ERROR: Must run from project root directory"
    exit 1
fi

echo "Step 1: Verifying configuration..."
echo ""

# Critical Check: Remove index.js if it exists
if [ -f "index.js" ]; then
    echo "  [!] Found conflicting index.js - REMOVING IT"
    rm index.js
    echo "  ✓ Removed index.js"
else
    echo "  ✓ No index.js (correct)"
fi

# Check package.json
if grep -q '"main".*"node_modules/expo/AppEntry.js"' package.json; then
    echo "  ✓ package.json uses correct entry point"
else
    echo "  [!] WARNING: package.json may have incorrect entry point"
fi

# Check App.tsx exists
if [ -f "App.tsx" ]; then
    echo "  ✓ App.tsx exists"
else
    echo "  [X] ERROR: App.tsx not found"
    exit 1
fi

# Check .env
if [ -f ".env" ]; then
    echo "  ✓ .env file exists"
else
    echo "  [!] WARNING: .env file not found"
fi

echo ""
echo "Step 2: Clearing caches..."
echo ""

# Remove cache directories
if [ -d ".expo" ]; then
    rm -rf .expo
    echo "  ✓ Cleared .expo directory"
fi

if [ -d "node_modules/.cache" ]; then
    rm -rf node_modules/.cache
    echo "  ✓ Cleared bundler cache"
fi

echo ""
echo "Step 3: Checking dependencies..."
echo ""

if [ ! -d "node_modules" ]; then
    echo "  Installing dependencies..."
    npm install
else
    echo "  ✓ node_modules exists"
fi

echo ""
echo "========================================="
echo "  Configuration Verified!"
echo "========================================="
echo ""
echo "Starting Expo development server..."
echo ""
echo "When the QR code appears:"
echo "  1. Open Expo Go on your phone"
echo "  2. Scan the QR code"
echo "  3. App should load successfully!"
echo ""
echo "Expected: No 'failed to download remote update' error"
echo ""
echo "========================================="
echo ""

# Start Expo with clear flag
npx expo start --clear
