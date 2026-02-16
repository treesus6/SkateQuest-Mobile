#!/bin/bash

echo "========================================="
echo "SkateQuest Expo Go Setup Verification"
echo "========================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check 1: index.js should NOT exist
echo -n "1. Checking for conflicting index.js... "
if [ -f "index.js" ]; then
    echo -e "${RED}FAIL${NC}"
    echo "   ERROR: index.js exists and will conflict with Expo's standard entry point"
    echo "   Run: rm index.js"
    exit 1
else
    echo -e "${GREEN}PASS${NC}"
    echo "   No index.js found (correct)"
fi

# Check 2: package.json should use standard entry point
echo -n "2. Checking package.json entry point... "
ENTRY=$(grep '"main"' package.json | grep 'expo/AppEntry.js')
if [ -z "$ENTRY" ]; then
    echo -e "${RED}FAIL${NC}"
    echo "   ERROR: package.json should have: \"main\": \"node_modules/expo/AppEntry.js\""
    exit 1
else
    echo -e "${GREEN}PASS${NC}"
    echo "   Using: node_modules/expo/AppEntry.js"
fi

# Check 3: App.tsx should exist
echo -n "3. Checking for App.tsx... "
if [ ! -f "App.tsx" ]; then
    echo -e "${RED}FAIL${NC}"
    echo "   ERROR: App.tsx not found"
    exit 1
else
    echo -e "${GREEN}PASS${NC}"
    echo "   App.tsx exists"
fi

# Check 4: app.json should NOT have updates configuration
echo -n "4. Checking app.json for updates config... "
UPDATES=$(grep -A5 '"updates"' app.json)
if [ -n "$UPDATES" ]; then
    echo -e "${YELLOW}WARNING${NC}"
    echo "   app.json has 'updates' configuration"
    echo "   For Expo Go development, this is not needed and may cause issues"
else
    echo -e "${GREEN}PASS${NC}"
    echo "   No updates config (correct for Expo Go)"
fi

# Check 5: Environment variables
echo -n "5. Checking .env file... "
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}WARNING${NC}"
    echo "   .env file not found"
    echo "   Create .env with EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY"
else
    echo -e "${GREEN}PASS${NC}"
    SUPABASE_URL=$(grep 'EXPO_PUBLIC_SUPABASE_URL' .env)
    SUPABASE_KEY=$(grep 'EXPO_PUBLIC_SUPABASE_KEY' .env)
    if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ]; then
        echo -e "${YELLOW}WARNING${NC}"
        echo "   .env exists but may be missing required variables"
    else
        echo "   .env has required Supabase variables"
    fi
fi

# Check 6: Required dependencies
echo -n "6. Checking node_modules... "
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}WARNING${NC}"
    echo "   node_modules not found. Run: npm install"
else
    echo -e "${GREEN}PASS${NC}"
    echo "   node_modules exists"
fi

echo ""
echo "========================================="
echo "Summary"
echo "========================================="
echo ""
echo "All critical checks passed!"
echo ""
echo "To start the app:"
echo "  1. Clear caches: rm -rf .expo node_modules/.cache"
echo "  2. Start Expo: npx expo start --clear"
echo "  3. Scan QR code in Expo Go"
echo ""
echo "Expected behavior:"
echo "  - No 'failed to download remote update' error"
echo "  - App loads within 10 seconds"
echo "  - Shows Auth screen or Map screen"
echo ""
