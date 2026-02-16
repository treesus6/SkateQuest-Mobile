#!/bin/bash
# BUILD SKATEQUEST FOR ALL PLATFORMS
# Run this script to build iOS and Android simultaneously

set -e

echo "🚀 Building SkateQuest for ALL platforms..."
echo ""

# Check if logged in
echo "Checking Expo authentication..."
if ! npx eas-cli whoami &> /dev/null; then
    echo "❌ Not logged in. Logging in now..."
    eas login
fi

echo "✅ Authenticated!"
echo ""

# Build both platforms simultaneously
echo "🔨 Starting builds for iOS and Android..."
echo "This will take ~15-20 minutes"
echo ""

# Start Android build
echo "📱 Starting Android APK build..."
eas build --platform android --profile production --non-interactive &
ANDROID_PID=$!

# Start iOS build
echo "🍎 Starting iOS IPA build..."
eas build --platform ios --profile production --non-interactive &
IOS_PID=$!

echo ""
echo "⏳ Waiting for builds to complete..."
echo "Android PID: $ANDROID_PID"
echo "iOS PID: $IOS_PID"
echo ""

# Wait for both
wait $ANDROID_PID
ANDROID_EXIT=$?

wait $IOS_PID
IOS_EXIT=$?

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ BUILD COMPLETE!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $ANDROID_EXIT -eq 0 ]; then
    echo "✅ Android APK: Ready"
else
    echo "❌ Android APK: Failed (see logs above)"
fi

if [ $IOS_EXIT -eq 0 ]; then
    echo "✅ iOS IPA: Ready"
else
    echo "❌ iOS IPA: Failed (see logs above)"
fi

echo ""
echo "Download your builds at: https://expo.dev/accounts/[your-username]/projects/skatequest-dev/builds"
echo ""
echo "Next steps:"
echo "1. Download both APK and IPA files"
echo "2. See DISTRIBUTE_TO_STORES.md for distribution guides"
echo ""
