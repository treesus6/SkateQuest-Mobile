#!/bin/bash
# Production Validation Script for SkateQuest v1.0.0
# This script validates the production build before deployment

echo "🔍 SkateQuest v1.0.0 Production Validation"
echo "=========================================="
echo ""

ERRORS=0
WARNINGS=0

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} Found: $1"
        return 0
    else
        echo -e "${RED}✗${NC} Missing: $1"
        ((ERRORS++))
        return 1
    fi
}

check_json() {
    if python3 -m json.tool "$1" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Valid JSON: $1"
        return 0
    else
        echo -e "${RED}✗${NC} Invalid JSON: $1"
        ((ERRORS++))
        return 1
    fi
}

# Check required files
echo "📁 Checking Required Files..."
check_file "index.html"
check_file "app.js"
check_file "main.js"
check_file "style.css"
check_file "manifest.json"
check_file "service-worker.js"
check_file "pwa.js"
check_file "robots.txt"
check_file "sitemap.xml"
check_file "firebase.json"
check_file "firestore.rules"
check_file "storage.rules"
check_file "netlify.toml"
echo ""

# Check documentation
echo "📚 Checking Documentation..."
check_file "README.md"
check_file "CHANGELOG.md"
check_file "RELEASE_NOTES.md"
check_file "DEPLOYMENT_CHECKLIST.md"
check_file "PRODUCTION.md"
echo ""

# Check PWA icons
echo "🎨 Checking PWA Icons..."
check_file "icons/skatequest-icon-192.png"
check_file "icons/skatequest-icon-512.png"
check_file "icons/skatequest-icon-192.svg"
check_file "icons/skatequest-icon-512.svg"
echo ""

# Validate JSON files
echo "🔧 Validating JSON Files..."
check_json "package.json"
check_json "manifest.json"
check_json "firebase.json"
echo ""

# Check for temporary files (should not exist)
echo "🧹 Checking for Temporary Files..."
TEMP_FILES=(
    "Untitled-1.html"
    "Untitled-2.js"
    "Untitled-3.css"
    "Untitled-4.json"
    "test.html"
    "clear-cache.html"
    "firestore.rules.bak"
    "firestore.rules.local"
    "validate-fixes.js"
)

for file in "${TEMP_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${RED}✗${NC} Found temporary file: $file (should be removed)"
        ((WARNINGS++))
    fi
done

if [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓${NC} No temporary files found"
fi
echo ""

# Check version in package.json
echo "📦 Checking Version..."
VERSION=$(python3 -c "import json; print(json.load(open('package.json'))['version'])" 2>/dev/null)
if [ "$VERSION" = "1.0.0" ]; then
    echo -e "${GREEN}✓${NC} Version is 1.0.0"
else
    echo -e "${RED}✗${NC} Version is $VERSION (expected 1.0.0)"
    ((ERRORS++))
fi
echo ""

# Check service worker cache version
echo "💾 Checking Service Worker Cache..."
if grep -q "skatequest-cache-v9" service-worker.js; then
    echo -e "${GREEN}✓${NC} Service worker cache version is v9"
else
    echo -e "${YELLOW}⚠${NC} Service worker cache version may not be v9"
    ((WARNINGS++))
fi
echo ""

# Check production URLs
echo "🌐 Checking Production URLs..."
if grep -q "www.sk8quest.com" robots.txt; then
    echo -e "${GREEN}✓${NC} robots.txt uses production URL"
else
    echo -e "${RED}✗${NC} robots.txt missing production URL"
    ((ERRORS++))
fi

if grep -q "www.sk8quest.com" sitemap.xml; then
    echo -e "${GREEN}✓${NC} sitemap.xml uses production URL"
else
    echo -e "${RED}✗${NC} sitemap.xml missing production URL"
    ((ERRORS++))
fi

if grep -q "www.sk8quest.com" index.html; then
    echo -e "${GREEN}✓${NC} index.html uses production URL in meta tags"
else
    echo -e "${YELLOW}⚠${NC} index.html may not have production URL in meta tags"
    ((WARNINGS++))
fi
echo ""

# Check Firebase configuration
echo "🔥 Checking Firebase Configuration..."
if grep -q "skatequest-666" index.html; then
    echo -e "${GREEN}✓${NC} Firebase project ID found in index.html"
else
    echo -e "${RED}✗${NC} Firebase project ID not found in index.html"
    ((ERRORS++))
fi

if grep -q "firebaseConfig" index.html; then
    echo -e "${GREEN}✓${NC} Firebase config found in index.html"
else
    echo -e "${RED}✗${NC} Firebase config not found in index.html"
    ((ERRORS++))
fi
echo ""

# Summary
echo "=========================================="
echo "📊 Validation Summary"
echo "=========================================="

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed! Ready for production deployment.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Review DEPLOYMENT_CHECKLIST.md"
    echo "2. Merge to main branch"
    echo "3. GitHub Actions will deploy automatically"
    echo "4. Monitor deployment at https://www.sk8quest.com"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ $WARNINGS warning(s) found.${NC}"
    echo "Review warnings above. Deployment can proceed but review is recommended."
    exit 0
else
    echo -e "${RED}✗ $ERRORS error(s) and $WARNINGS warning(s) found.${NC}"
    echo "Fix errors above before deploying to production."
    exit 1
fi
