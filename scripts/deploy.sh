#!/bin/bash
# Auto-deploy script for SkateQuest production

echo "🚀 SkateQuest Auto-Deploy Starting..."

# Check for required environment variables
if [ -z "$FIREBASE_PROJECT_ID" ]; then
    echo "❌ Error: FIREBASE_PROJECT_ID environment variable is not set"
    echo "Please set FIREBASE_PROJECT_ID before running this script:"
    echo "  export FIREBASE_PROJECT_ID=your-project-id"
    exit 1
fi

if [ -z "$FIREBASE_TOKEN" ]; then
    echo "❌ Error: FIREBASE_TOKEN environment variable is not set"
    echo "Please set FIREBASE_TOKEN before running this script:"
    echo "  export FIREBASE_TOKEN=your-firebase-token"
    echo "You can get a token by running: firebase login:ci"
    exit 1
fi

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "Installing Firebase CLI..."
    npm install -g firebase-tools
fi

# Login to Firebase (will use token in CI/CD)
echo "📝 Deploying Firebase Rules..."
firebase deploy \
  --only firestore:rules,storage:rules \
  --project "$FIREBASE_PROJECT_ID" \
  --token "$FIREBASE_TOKEN"

# Deploy to Netlify (happens automatically via Git push)
echo "✅ Firebase rules deployed!"
echo "✅ Netlify deployment triggered automatically"
echo "🎉 Production deployment complete!"
echo ""
echo "Live site: https://www.sk8quest.com"
echo "Firebase Console: https://console.firebase.google.com/project/$FIREBASE_PROJECT_ID"
