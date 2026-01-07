#!/bin/bash
# SKATEQUEST - ONE-CLICK BUILD SCRIPT
# Run this on YOUR machine to build iOS and Android apps

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 SKATEQUEST - Building for ALL Platforms"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Your credentials (already filled in)
EXPO_USERNAME="treevanderveer@gmail.com"
EXPO_PASSWORD="Keagenj213@"

# Login
echo "🔐 Logging into Expo..."
export EXPO_CLI_USERNAME="$EXPO_USERNAME"
export EXPO_CLI_PASSWORD="$EXPO_PASSWORD"

# Use eas-cli for login
echo "$EXPO_USERNAME" > /tmp/expo_user.txt
echo "$EXPO_PASSWORD" >> /tmp/expo_user.txt

npx eas-cli login < /tmp/expo_user.txt 2>&1 || {
    echo "⚠️  Auto-login failed. Logging in manually..."
    npx eas-cli login
}

rm -f /tmp/expo_user.txt

echo "✅ Logged in!"
echo ""

# Build both platforms
echo "🔨 Starting builds..."
echo ""
echo "📱 Building Android APK..."
echo "🍎 Building iOS IPA..."
echo ""
echo "This will take ~15-20 minutes..."
echo ""

# Build both simultaneously
npx eas-cli build --platform all --profile production --non-interactive

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ BUILDS COMPLETE!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Download your apps:"
echo "👉 https://expo.dev/accounts/$(npx eas-cli whoami)/projects/skatequest/builds"
echo ""
echo "⚠️  NOTE: These are REAL standalone native apps (APK/IPA)"
echo "    NOT Expo Go builds - they work independently!"
echo ""
echo "Next steps:"
echo "1. Download APK and IPA files"
echo "2. See DISTRIBUTE_TO_STORES.md for distribution"
echo "3. Upload to APKPure TODAY (instant, free)"
echo ""
