#!/bin/bash

# Quick test to verify the Expo Go fix is in place

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}  SkateQuest - Fix Verification${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

PASS=0
FAIL=0

# Test 1: No index.js in root
echo -n "Checking for conflicting index.js... "
if [ -f "index.js" ]; then
    echo -e "${RED}FAIL${NC}"
    echo "  ERROR: index.js still exists!"
    echo "  Run: rm index.js"
    FAIL=$((FAIL+1))
else
    echo -e "${GREEN}PASS${NC}"
    PASS=$((PASS+1))
fi

# Test 2: package.json entry point
echo -n "Checking package.json entry point... "
if grep -q '"main".*"node_modules/expo/AppEntry.js"' package.json; then
    echo -e "${GREEN}PASS${NC}"
    PASS=$((PASS+1))
else
    echo -e "${RED}FAIL${NC}"
    echo "  ERROR: Incorrect entry point"
    FAIL=$((FAIL+1))
fi

# Test 3: App.tsx exists
echo -n "Checking for App.tsx... "
if [ -f "App.tsx" ]; then
    echo -e "${GREEN}PASS${NC}"
    PASS=$((PASS+1))
else
    echo -e "${RED}FAIL${NC}"
    echo "  ERROR: App.tsx missing"
    FAIL=$((FAIL+1))
fi

# Test 4: No updates in app.json
echo -n "Checking app.json (no updates)... "
if grep -q '"updates"' app.json; then
    echo -e "${YELLOW}WARNING${NC}"
    echo "  app.json has 'updates' config (not recommended for Expo Go)"
else
    echo -e "${GREEN}PASS${NC}"
    PASS=$((PASS+1))
fi

# Test 5: .env exists
echo -n "Checking .env file... "
if [ -f ".env" ]; then
    echo -e "${GREEN}PASS${NC}"
    PASS=$((PASS+1))
else
    echo -e "${YELLOW}WARNING${NC}"
    echo "  .env not found (may need Supabase credentials)"
fi

# Test 6: node_modules exists
echo -n "Checking dependencies... "
if [ -d "node_modules" ]; then
    echo -e "${GREEN}PASS${NC}"
    PASS=$((PASS+1))
else
    echo -e "${YELLOW}WARNING${NC}"
    echo "  Run: npm install"
fi

echo ""
echo -e "${BLUE}=========================================${NC}"
echo -e "  Results: ${GREEN}${PASS} passed${NC}, ${RED}${FAIL} failed${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✓ ALL CRITICAL CHECKS PASSED!${NC}"
    echo ""
    echo "The fix is in place. Ready to start the app!"
    echo ""
    echo "To start:"
    echo "  bash RUN_THIS_FIRST.sh"
    echo ""
    echo "Or manually:"
    echo "  npx expo start --clear"
    echo ""
    exit 0
else
    echo -e "${RED}✗ SOME CHECKS FAILED${NC}"
    echo ""
    echo "Please review the errors above."
    echo ""
    exit 1
fi
