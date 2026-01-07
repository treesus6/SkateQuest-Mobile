#!/bin/bash
# Run this script to build your APK

echo "🚀 Building SkateQuest APK..."
echo ""
echo "Step 1: Login to Expo"
eas login

echo ""
echo "Step 2: Building APK (this takes ~10-15 minutes)"
eas build --platform android --profile production

echo ""
echo "✅ Done! Download link will appear above."
echo "Share the APK with your users!"
